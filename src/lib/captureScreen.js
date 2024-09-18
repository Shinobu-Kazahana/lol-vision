const { desktopCapturer } = require('electron');
const axios = require('axios');
const FormData = require('form-data');

let lastSourceId = null;
let axiosInstance = null;

const captureAndSendScreenshot = async (processName, apiKey, projectId, modelVersion) => {
  const startTime = process.hrtime.bigint();

  try {
    // Find the source each time to ensure we get a fresh thumbnail
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 3440, height: 1440 } });
    const source = sources.find(s => s.name.toLowerCase().includes(processName.toLowerCase()));

    if (!source) {
      console.error(`Unable to find screen source for process: ${processName}`);
      return null;
    }

    // Check if the source has changed
    if (source.id !== lastSourceId) {
      console.log('Source changed, updating lastSourceId');
      lastSourceId = source.id;
    }

    // Capture the screenshot
    const image = source.thumbnail.toPNG();

    // Reuse or create axios instance
    if (!axiosInstance) {
      axiosInstance = axios.create({
        baseURL: 'http://127.0.0.1:9001',
        params: { api_key: apiKey },
      });
    }

    // Create a new FormData instance for each request
    const formData = new FormData();
    formData.append('file', image, { filename: 'screenshot.png', contentType: 'image/png' });

    // Send the screenshot to the inference server
    const response = await axiosInstance.post(`/${projectId}/${modelVersion}`, formData, {
      headers: formData.getHeaders(),
    });

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    console.log(`Screenshot captured and sent in ${duration.toFixed(2)}ms`);

    return response.data;
  } catch (error) {
    if (error.message.includes('Source is not capturable')) {
      console.warn('Source temporarily not capturable, skipping this frame');
      return null;
    }
    console.error('Error capturing or sending screenshot:', error);
    return null;
  }
};

module.exports = { captureAndSendScreenshot };
