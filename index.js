"use strict";
const line = require("@line/bot-sdk");
const express = require("express");
const configGet = require("config"); //for azur
const config = {
  //for line
  channelAccessToken: configGet.get("CHANNEL_ACCESS_TOKEN"),
  channelSecret: configGet.get("CHANNEL_SECRET")
};
const request = require("request");
const msSubscriptionKey = configGet.get("MS_SUBSCRIPTION_KEY");
const client = new line.Client(config);
const app = express();

app.post("/callback", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
}); //app.post end

function handleEvent(event) {
  console.log("event");
  console.log(event);
  if (event.type !== "message" || event.message.type !== "text") {
    //return Promise.resolve(null);  ==> ignore non-text-message event
    console.log("event type is::" + event.type);
    console.log("event.message.type is::" + event.message.type);
    console.log("event detail::" + JSON.stringify(event));

    MSimageRecognition(event);
  } else {
    const echo = { type: "text", text: "請輸入一張照片進行辨識" };
    return client.replyMessage(event.replyToken, echo);
  }

  //   //const echo = { type: "text", text: event.message.text };
  //   //return client.replyMessage(event.replyToken, echo);
} //function end

function MSimageRecognition(thisevent) {
  console.log("[MSimageRecog is in]");

  let thisResult = null;
  const subscriptionKey = msSubscriptionKey;
  const uriBase =
    "https://westcentralus.api.cognitive.microsoft.com/vision/v2.0/analyze";
  const imageID = thisevent.message.id;
  console.log("imageID:" + imageID);

  const params = {
    overload: "stream",
    visualFeatures: "Description",
    details: "",
    language: "zh"
  };

  const options = {
    uri: uriBase,
    qs: params,
    headers: {
      "Content-Type": "application/octet-stream",
      "Ocp-Apim-Subscription-Key": subscriptionKey
    }
  }; //const option end

  client.getMessageContent(imageID).then(stream => {
    var data = null;
    stream.on("data", chunk => {
      if (data) {
        data = Buffer.concat([data, chunk]);
      } else {
        data = chunk;
      }
      console.log("adding");
    });

    stream.on("error", err => {
      console.log(err);
    });

    stream.on("end", () => {
      console.log("IMAGE DONE!");
      options.body = data;

      request.post(options, (error, response, body) => {
        let echo = null;
        console.log("[req in]");
        if (error) {
          console.log("ERR:", error);
          return;
        }

        let jsonResponse = JSON.stringify(JSON.parse(body), null, "");
        console.log("JSON RESPONSE\n");
        console.log(jsonResponse);

        if (JSON.parse(body).description.captions.length != 0) {
          thisResult = JSON.parse(body).description.captions[0].text;
          console.log("thisResult" + thisResult);
          echo = { type: "text", text: thisResult };
        } else {
          echo = { type: "text", text: "TOO DEEP TO KNOW" };
        }
        client.replyMessage(thisevent.replyToken, echo);
      }); //req.body
    }); //stream on end
  }); //.then
} //function MSimageRecognition end

const port = process.env.PORT || process.env.post || process.env.Port || 1235;
app.listen(port, () => {
  console.log(`listen on ${port}`);
});
