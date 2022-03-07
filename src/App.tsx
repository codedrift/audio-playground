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

function calculateStats(analyzer: AnalyserNode) {
  const maxDb = analyzer.maxDecibels;
  const minDb = analyzer.minDecibels;

  const dataArray = new Float32Array(analyzer.frequencyBinCount);

  //TODO: get some sort of percentage

  console.log("STATS", {
    analyzer,
    minDb,
    maxDb,
    dataArray,
    bincount: analyzer.frequencyBinCount,
    // mapped,
    // percent,
  });

  return { avg: 0 };
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [source, setSource] = useState<MediaStreamAudioSourceNode | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [frame, setFrame] = useState<number>(0);
  const [stats, setStats] = useState<any>({});

  const renderToCanvas = () => {
    if (analyzer) {
      setFrame(frame + 1);
      console.log("tick!");
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteTimeDomainData(dataArray);
      const s = calculateStats(analyzer);
      console.log(s);
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
            width: `${stats.avg * 100}%`,
          }}
        >
          <span>{`${Math.ceil(stats.avg * 100)}%`}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
