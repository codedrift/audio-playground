import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import React, { useRef, useState } from "react";
import { useInterval } from "usehooks-ts";
import styles from "./App.module.css";
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 100;
const FPS = 30;

function closeStream(stream?: MediaStream) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

function calculateStats(analyzer: AnalyserNode, byteData: Uint8Array) {
  const maxDb = analyzer.maxDecibels;
  const minDb = analyzer.minDecibels;

  // const dataArray = new Uint8Array(analyzer.frequencyBinCount);

  // analyzer.getByteFrequencyData(dataArray);
  //TODO: get some sort of percentage

  const mapped = byteData.map((i) => {
    if (i <= 127) {
      return 0 + 127 - i;
    }
    return i - 127;
  });

  const nonZero = mapped.filter((i) => i > 0);

  const highest = nonZero.sort().reverse()[0];

  const avg =
    nonZero.length > 0
      ? nonZero.reduce((prev, curr) => prev + curr, 0) / nonZero.length
      : 0;

  console.log("STATS", {
    analyzer,
    minDb,
    maxDb,
    bincount: analyzer.frequencyBinCount,
    data: byteData,
    mapped,
    highest,
    // percent,
  });

  return { percent: avg / 127, highest: highest / 127 };
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [source, setSource] = useState<MediaStreamAudioSourceNode | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [frame, setFrame] = useState<number>(0);
  const [stats, setStats] = useState<any>({});
  const [high, setHigh] = useState<number>(0);

  const renderToCanvas = () => {
    if (analyzer) {
      setFrame(frame + 1);
      console.log("tick!");
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteTimeDomainData(dataArray);
      const s = calculateStats(analyzer, dataArray);
      console.log(s);
      if (s.highest > high) {
        setHigh(s.highest);
      }
      setStats(s);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "rgb(200, 200, 200)";
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgb(0, 0, 0)";
          ctx.beginPath();
          const sliceWidth = (CANVAS_WIDTH * 1.0) / bufferLength;
          let x = 0;
          for (var i = 0; i < bufferLength; i++) {
            var v = dataArray[i] / 128.0;
            var y = (v * CANVAS_HEIGHT) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }
          ctx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
          ctx.stroke();
        }
      }
    }
  };

  useInterval(renderToCanvas, 1000 / FPS);

  const getPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      closeStream(stream);
    } catch (error) {
      console.error("Error getting user media", error);
    }
  };

  const stopRecord = () => {
    if (mediaStream) {
      closeStream(mediaStream);
      setMediaStream(null);
    }
    setSource(null);
    setAnalyzer(null);
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  const recordAudio = async () => {
    const mStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mStream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);

    analyser.fftSize = 2048;

    setAudioContext(audioContext);
    setMediaStream(mStream);
    setSource(source);
    setAnalyzer(analyser);
    setFrame(0);
  };

  const isRecording = mediaStream || audioContext || source;

  const toggleRecord = () => {
    if (isRecording) {
      stopRecord();
    } else {
      recordAudio();
    }
  };

  const perc = (stats.percent || 0) * 100;

  return (
    <div className={styles.root}>
      <button onClick={getPermission}>Permission</button>
      <div>Frame {frame}</div>
      <div>FPS {FPS}</div>
      <button onClick={toggleRecord}>{isRecording ? "stop" : "start"}</button>
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
      <div className={styles.indicatorWrapper}>
        <div
          className={styles.indicator}
          style={{
            width: `${perc}%`,
          }}
        >
          <span>{`${Math.ceil(perc)}%`}</span>
        </div>
      </div>
      <div className={styles.slider}>
        <Slider
          min={0}
          max={100}
          value={Math.ceil(high * 100)}
          railStyle={
            {
              // width: "80%",
              // backgroundColor: "red",
            }
          }
        />
      </div>
    </div>
  );
}

export default App;
