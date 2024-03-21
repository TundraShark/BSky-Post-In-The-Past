import "dotenv/config";
import fs from "fs";
import mime from "mime";
import axios from "axios";

const HANDLE  = process.env.HANDLE;
const API_KEY = process.env.API_KEY;

async function GetAuthentication () {
  const body = { identifier: HANDLE, password: API_KEY };
  const res = await axios.post("https://bsky.social/xrpc/com.atproto.server.createSession", body);
  const { did, accessJwt } = res.data;

  return { did, accessJwt };
}

async function Image (imagePath, imageExtension, accessJwt) {
  const fileData = fs.readFileSync(imagePath);

  if (Buffer.byteLength(fileData) > 1_000_000) {
    console.log(`Image is too large (1 million bytes max), the file size was: ${Buffer.byteLength(fileData)}`);
    process.exit();
  }

  const res = await axios.post("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", fileData, {
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": imageExtension
    }
  });

  return res.data.blob;
}

async function CreatePost (did, accessJwt, blob, text) {
  const body = {
    repo: did,
    collection: "app.bsky.feed.post",
    record: {
      "$type": "app.bsky.feed.post",
      text: text,
      createdAt: "1775-04-18T00:00:00.000000Z", // April 18, 1775
      embed: {
        "$type": "app.bsky.embed.images",
        images: [{
          image: blob,
          alt: text
        }]
      }
    }
  };
  const options = { headers: { Authorization: `Bearer ${accessJwt}` }};
  const res = await axios.post("https://bsky.social/xrpc/com.atproto.repo.createRecord", body, options);

  console.log(res.status);
}

async function Main (text, filePath) {
  const { did, accessJwt } = await GetAuthentication();
  const mimeType = mime.getType(filePath);
  const blob = await Image(filePath, mimeType, accessJwt);
  console.log(blob);
  await CreatePost(did, accessJwt, blob, text);
}

Main(
  "The British are coming! The British are coming!\n\nCheck the date of this post, I can make posts in the past lol",
  "./Paul-Revere-Ride.jpg"
);
