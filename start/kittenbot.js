/* *****************************************************************************
Copyright 2020 Google LLC

Licensed under the Apache License, Version 2.0 (the "License")
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
********************************************************************************

This is a sample Slack bot built with Botkit.
*/

const { Botkit, BotkitConversation } = require("botkit");
const {
  SlackAdapter,
  SlackEventMiddleware,
} = require("botbuilder-adapter-slack");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

/**
 * Returns the secret string from Google Cloud Secret Manager
 * @param {string} name The name of the secret.
 * @return {string} The string value of the secret.
 */
async function accessSecretVersion(name) {
  const client = new SecretManagerServiceClient();
  const projectId = process.env.PROJECT_ID;
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/1`,
  });

  // Extract the payload as a string.
  const payload = version.payload.data.toString("utf8");

  return payload;
}

/**
 * Asynchronous function to initialize kittenbot.
 */
async function kittenbotInit() {
  const adapter = new SlackAdapter({
    clientSigningSecret: await accessSecretVersion("client-signing-secret"),
    botToken: await accessSecretVersion("bot-token"),
  });

  adapter.use(new SlackEventMiddleware());

  const controller = new Botkit({
    webhook_uri: "/api/messages",
    adapter: adapter,
  });

  // Add Kitten Dialog
  const convo = createKittenDialog(controller);
  controller.addDialog(convo);

  // Controller is ready
  controller.ready(() => {
    console.log("ENTERED READY");
    // START: listen for cat emoji delivery
    controller.hears(
      ["Hello everyone! :zoomba:", "test", "hi"],
      ["message", "direct_message"],
      async (bot, message) => {
        // Don't respond to self
        if (message.bot_id !== message.user) {
          console.log("Heard the hello everyone");
          numGoing = 0;
          setTimeout(function () {
            console.log("Timeout check complete!");
            if (numGoing < threshhold) {
              console.log("Not enough people said yes");
              // Not enough people said yes in the timespan
              async (response, convo, bot) => {
                console.log("Going to no_zoom thread");
                await convo.gotoThread("no_zoom");
              };
            }
          }, 10000); //600000
          console.log("begining kitten delivery");
          await bot.startConversationInChannel(message.channel, message.user);
          return bot.beginDialog("kitten-delivery");
        }
      }
    );
  });
}

const maxCats = 20;
const threshhold = 3;
let numGoing = 0;

/**
 * Function to create the kitten conversation
 * @param {Object} controller The botkit controller.
 * @return {Object} The BotkitConversation object.
 */
function createKittenDialog(controller) {
  const convo = new BotkitConversation("kitten-delivery", controller);
  console.log("Start of the createKittenDialog");
  let prompt = "";
  if (numGoing == 0) {
    prompt = "Do you want to join a zoom room?"
  } else {
    prompt = "Does anyone else want to join? There are " + numGoing + "/" + threshhold + " people going right now."
  }

  convo.ask(prompt, [
    {
      pattern: "yes",
      handler: async (response, convo, bot) => {
        numGoing++;
        console.log("we got the first yes");
        if  (numGoing >= threshhold) {
          console.log("Activating zoom....");
          await convo.gotoThread("yes_zoom");
        } else {
          bot.beginDialog("kitten-delivery");
        }
        // await convo.gotoThread("ask_question");
      },
    },
  ]);

  // convo.addQuestion(
  //   "Does anyone else want to join a zoom room?",
  //   [
  //     {
  //       pattern: "yes",
  //       handler: async (response, convo, bot) => {
  //         numGoing++;
  //         console.log("we got more yeses");
  //         if (numGoing >= threshhold) {
  //           console.log("Activating zoom....");
  //           await convo.gotoThread("yes_zoom");
  //         } else {
  //           await convo.gotoThread("ask_again");
  //         }
  //       },
  //     },
  //     {
  //       default: true,
  //       handler: async (response, convo, bot, message) => {
  //         if (response) {
  //           await convo.gotoThread('ask_again')
  //         } else {
  //           // The response '0' is interpreted as null
  //           // await convo.gotoThread('zero_kittens')
  //         }
  //       }
  //     }
  //   ],
  //   "response",
  //   "ask_question"
  // );

  // convo.addMessage("Thanks for responding!", "ask_again");
  // convo.addAction("ask_question", "ask_again");

  convo.addMessage(
    {
      text:
        "zoom link here!!!!!! https://atlassian.zoom.us/j/96856753417?pwd=QnppS2ovRXVtc2hJRG93ZjlqWklvUT09",
    },
    "yes_zoom"
  );
  // convo.addAction("ask_question", "ask_again");

  convo.addMessage(
    {
      text: "Not enough people are around... :sadpanda: Try again later!",
    },
    "no_zoom"
  );

  return convo;
}

kittenbotInit();
