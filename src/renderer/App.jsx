import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import BoundingBox from "./components/BoundingBox";
import { useEffect, useState, useCallback } from "react";

function Hello() {
  const [detectedObject, setDetectedObject] = useState(null);
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const screenshotSize = { width: 1920, height: 1080 }; // Fixed size of the screenshot

  const handleObjectDetected = useCallback((event) => {
    console.log("Received object-detected event");
    console.log("Event:", event);

    const data = event && typeof event === 'object' ? event : null;

    if (data && 'x' in data && 'y' in data && 'width' in data && 'height' in data) {
      console.log("Valid data found in event object, setting detected object");
      setDetectedObject(data);
    } else {
      console.error("Received invalid data structure");
      setDetectedObject(null);
    }
  }, []);

  useEffect(() => {
    console.log("Setting up IPC listener and window resize handler");

    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);

    if (window.electron && window.electron.ipcRenderer) {
      console.log("IPC Renderer available, adding listener");
      const removeListener = window.electron.ipcRenderer.on('object-detected', handleObjectDetected);

      return () => {
        console.log("Cleaning up IPC listener and resize handler");
        removeListener();
        window.removeEventListener('resize', handleResize);
      };
    } else {
      console.error("Electron IPC not available");
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [handleObjectDetected]);

  // Function to adjust coordinates based on screen size and screenshot size
  const adjustCoordinates = (obj, screen, screenshot) => {
    if (!obj || !screen || !screenshot) return obj;

    // Calculate the game area size on the screen (maintaining 16:9 aspect ratio)
    const gameHeight = screen.height;
    const gameWidth = (gameHeight * 16) / 9;

    // Calculate scaling factors
    const scaleX = gameWidth / screenshot.width;
    const scaleY = gameHeight / screenshot.height;

    // Calculate offsets to center the game area on the screen
    const offsetX = (screen.width - gameWidth) / 2;
    const offsetY = 0; // No vertical offset needed as the height is full

    return {
      ...obj,
      x: obj.x * scaleX + offsetX,
      y: obj.y * scaleY + offsetY,
      width: obj.width * scaleX,
      height: obj.height * scaleY
    };
  };

  const adjustedObject = adjustCoordinates(detectedObject, screenSize, screenshotSize);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      position: "relative",
      overflow: "hidden",
      //border: "1px solid red",
      color: "neon-green"
    }}>
      <div style={{
        backgroundColor: "#25c40a",
        color: "black",
        padding: "5px",
        margin: "5px",
        fontWeight: "bold"
      }}>
        IPC Status: {window.electron && window.electron.ipcRenderer ? "Available" : "Not Available"}
      </div>
      <div style={{
        backgroundColor: "#25c40a",
        color: "black",
        padding: "5px",
        margin: "5px",
        fontWeight: "bold",
        wordBreak: "break-all"
      }}>
        Detected Player: {JSON.stringify(detectedObject)}
      </div>

      {adjustedObject?.x ? (
        <BoundingBox
          key={adjustedObject.detectionId || "detection"}
          x={(detectedObject.x) -80}
          y={(detectedObject.y)- 80}
          width={detectedObject.width }
          height={detectedObject.height}
          label={`${detectedObject.class || "Unknown"}`}
        />
      ) : (
        <div></div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
