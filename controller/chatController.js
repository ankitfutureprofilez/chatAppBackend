const Chat = require('../models/Messages')
const user = require('../models/Users')
const Conversation = require("../models/Converstion")
const io = require('socket.io')(); // Don't need this since io is initialized in the server file
const QuestionAnswer = require('../models/OpenAi')
require('dotenv').config();

const { Configuration, OpenAIApi } = require("openai");
const ApiKey = process.env.OPENAI_API_KEY

const configuration = new Configuration({
  apiKey: ApiKey,
});

const openai = new OpenAIApi(configuration);
exports.findAnswer = async (req, res) => {
  try {
    const userQuestion = req.body.question;
    const fields = ['React.js', 'Node.js', 'PHP', 'react js']; // Specify the relevant fields
    const companyDetails = "My company is future profilez and it is a web development company in jaipur india."; // Pass your company details in the request body
    const questions = `
      Info: My company name is future profilez.
      Info: Our location is in Bani Park jaipur india. 
      Info: My company Services  Mobile,E-business, PHP,Laravel Development,CakePHP Development,Zend Development,CodeIgniter Development,Yii Development,Custom PHP Development,PHP MySQL Development
      Info: My company website https://futureprofilez.com
      Info: Company owner Mr.Vishal Solanki.
      Info: Company contact details are whatsapp no +919983333334, info@futureprofilez.com, +91-9983333334
      Info: We works on all web development technologies such as react js, node js. 
    `;

    if (!userQuestion || !companyDetails) {
      return res.status(400).json({
        msg: 'Bad Request: Missing question or companyDetails field in the request body.',
        status: 400,
      });
    }

    const prompt = `Prompt: You are an AI Assistant for a web development company. Read belows questions.
      ${questions}
      Please provide answer based on above information given. If my query not matches with above or try to find it on our website https://futureprofilez.com or search it on google then give relevent answer for that query based on my business and if query is not related to web develpment then deny with a pleasent message to provide any information.
      My question is "${userQuestion}"
    `;

    const completion = await openai.createCompletion({
      model: 'text-davinci-002',
      prompt: prompt,
      max_tokens: 256
    });
    const assistantAnswer = completion.data.choices[0].text;
    const savedEntry = await QuestionAnswer.create({
      question: userQuestion,
      answer: assistantAnswer,
    });
    res.json({
      status: 200,
      data: assistantAnswer,
      msg: 'Successfully Retrieved Answer',
      savedEntry: savedEntry, 
    });

  } catch (err) {
    console.log(err);
    res.json({
      err: err,
      msg: 'Error Detected',
      status: 400,
    });
  }
};


exports.conversion = (async (req, res) => {
  try {
    const senderId = req.user.userId;
    const receiverId = req.body.userB;
    console.log("senderId", senderId)
    console.log("receiverId", receiverId)
    const lastuid = await Conversation.findOne({}, "uid").sort({ uid: -1 });
    const newuid = lastuid ? +lastuid.uid + 1 : 1;

    if (lastuid) {
      console.log("given the converstion id ")
    } else {
      const conver = new Conversation({
        userId: senderId,
        receiverId: receiverId,
        uid: newuid,
      });

    }
    const newconversation = await conver.save();
    console.log("newconversation", newconversation)

    res.json({
      status: 200,
      data: newconversation,
      msg: "Successfully Created"

    })

  } catch (err) {
    console.log(err)
    res.json({
      err: err,
      msg: "Error Detec",
      status: 400
    });
  }

})

exports.sendMessage = async (req, res) => {
  try {
    const receiverId = req.body.receiverId;
    const senderId = req.user.userId; // Assuming the authenticated user's ID is available in req.user.userId
    
    const chatMessage = new Chat({
      message: req.body.message,
      userId: senderId,
      receiveId: receiverId,

    });

    const savedMessage = await chatMessage.save();
    const lastUid = await Conversation.findOne({}, "uid").sort({ uid: -1 });
    const newUid = lastUid ? +lastUid.uid + 1 : 1;

    if (lastUid) {
      console.log("Given the conversation ID");
    } else {
      const conversation = new Conversation({
        userId: senderId,
        receiverId: receiverId,
        uid: newUid,
      });
      const newConversation = await conversation.save();
    }

    io.to(receiverId).emit('test-event', { message: req.body.message, senderId });

    res.json({
      receiveId: receiverId,
      status: true,
      success: true,
      message: savedMessage,

    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
};


exports.chatsMessageList = (async (req, res) => {
  console.log(req.params)
  const { receiveId } = req.params;
  console.log("receiveId", receiveId,)
  try {
    const records = await Chat.find({ receiveId: receiveId });
    console.log("records", records)
    res.json({
      chats: records,
      msg: "Succes",
      status: true
    })
  } catch (error) {
    console.log(error)
    res.json({
      error: error,
      status: false,
      msg: "Decline Chat"
    })
  }
}
);
