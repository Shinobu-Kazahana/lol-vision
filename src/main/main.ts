import path from "path";
import { app, BrowserWindow, shell, ipcMain, desktopCapturer, screen } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import MenuBuilder from "./menu";
import { resolveHtmlPath } from "./util";
import fs from "fs/promises";
import { captureAndSendScreenshot } from "../lib/captureScreen";
require("dotenv").config();


class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}


const extractPlayedChampion = (inferenceResult) => {
  if (!inferenceResult || !inferenceResult.predictions) {
    return null;
  }

  const playedChampion = inferenceResult.predictions.find(
    prediction => prediction.class === 'played_champion'
  );

  if (playedChampion) {
    return {
      x: playedChampion.x,
      y: playedChampion.y,
      width: playedChampion.width,
      height: playedChampion.height,
      confidence: playedChampion.confidence,
      class:playedChampion.class,
      detectionId: playedChampion.detection_id
    };
  }

  return null;
};



const apiKey = process.env.KEY;
const projectId = "leagueoflegends-kvjwx";
const modelVersion = "4";




let mainWindow = null;
const runObjectLoop = () => {
  const intervalId = setInterval(async () => {
    const result = await captureAndSendScreenshot('League of Legends (TM) Client', apiKey, projectId, modelVersion);
   // console.log(result)
    const player = extractPlayedChampion(result)
    //console.log("Sending player data to renderer:", player);
    if (mainWindow && !mainWindow.isDestroyed() && player) {
     console.log("Sending player data to renderer:", player);
      mainWindow.webContents.send('object-detected', {
        x: player.x,
        y: player.y,
        width: player.width,
        height: player.height,
        class: player.class, // Make sure to include the class
        confidence: player.confidence
      });
    }
    console.log(player)
  }, 200);
  // Optional: Function to stop the loop
  function stopLoop() {
    clearInterval(intervalId);
  }
  // Return the stop function in case you want to stop the loop later
  return stopLoop;
};


if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

if (isDebug) {
  require("electron-debug")();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS"];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../../assets");

  const getAssetPath = (...paths) => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 728,
    fullscreen: true,
    transparent: true,
    frame: false,
    icon: getAssetPath("icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: app.isPackaged
        ? path.join(__dirname, "preload.ts")
        : path.join(__dirname, "../../.erb/dll/preload.ts")
    }
  });
  mainWindow.setIgnoreMouseEvents(true);
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.loadURL(resolveHtmlPath("index.html"));

  mainWindow.on("ready-to-show", () => {
    if (!mainWindow) {
      throw new Error("\"mainWindow\" is not defined");
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("devtools-opened", () => {
    mainWindow.webContents.closeDevTools();
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});


app
  .whenReady()
  .then(() => {
    createWindow();
    const stop = runObjectLoop();// runs the function but the function also returns a function called stop loop
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);


//TODO delete
// # import client from inference sdk
// from inference_sdk import InferenceHTTPClient
// # import PIL for loading image
// from PIL import Image
// # import os for getting api key from environment
// import os
//
// # set the project_id, model_version, image_url
// project_id = "soccer-players-5fuqs"
// model_version = 1
// filename = "path/to/local/image.jpg"
//
// # create a client object
// client = InferenceHTTPClient(
//   api_url="http://localhost:9001",
//   api_key=os.environ["API_KEY"],
// )
//
// # load the image
// pil_image = Image.open(filename)
//
// # run inference
// results = client.infer(pil_image, model_id=f"{project_id}/{model_version}")
//
// print(results)
