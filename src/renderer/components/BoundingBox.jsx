import React, { useEffect } from 'react';

const BoundingBox = ({ x, y, width, height, label }) => {
  useEffect(() => {
    console.log("BoundingBox rendered with props:", { x, y, width, height, label });
    console.log("Computed style:", {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }, [x, y, width, height, label]);

  // Ensure all required props are numbers and finite
  const isValid = [x, y, width, height].every(val => typeof val === 'number' && isFinite(val));

  if (!isValid) {
    console.error("Invalid BoundingBox props:", { x, y, width, height, label });
    return null;
  }

  return (
    <div
      style={{
      // Prevent wrapping
        overflow: 'visible',   // Allow overflow
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: '2px solid green',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        background: 'rgba(59,190,69,0.2)', // Add this line
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-20px',
        left: '0',
        background: 'limegreen',
        color: 'black',
        padding: '4px 5px',
        fontSize: '12px',
        fontWeight: 'bold',
      }}>
        {label}
      </div>
    </div>
  );
};

export default BoundingBox;
