const MongoClient = require("mongodb").MongoClient;
const uri = process.env.DB;
const client = new MongoClient(uri, { useUnifiedTopology: true });
client.connect();

async function getUserId(id) {
  try {
    const loginData = client.db().collection("loginData");
    const result = await loginData.findOne(
      { _id: id },
      {
        projection: {
          password: 0,
        },
      }
    );
    return result !== null ? result._id : null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function addUser(newUser) {
  try {
    const loginData = client.db().collection("loginData");
    const insertResult = await loginData.insertOne({
      _id: newUser.id,
      password: newUser.password,
    });
    if (insertResult.insertedId === newUser.id) {
      const initialUser = {
        name: newUser.id,
        theme: newUser.theme,
        manifest: "",
        tags: "",
        filter: "",
        score: 0,
        mistruth: 0,
        results: [],
        lastActionTime: "",
        lastAction: "",
      };
      const users = client.db().collection("users");
      const avatars = client.db().collection("avatars");
      const conversations = client.db().collection("conversations");
      await users.insertOne({
        _id: newUser.id,
        ...initialUser,
      });
      await avatars.insertOne({
        _id: newUser.id,
        avatar: null,
      });
      await conversations.insertOne({
        _id: newUser.id,
      });
      const result = await users.findOneAndUpdate(
        { _id: newUser.id },
        {
          $set: {
            lastActionTime: Date.now(),
            lastAction: "SignUp",
          },
        },
        { returnOriginal: false }
      );
      return result.value;
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function login(loginInfo) {
  try {
    const loginData = client.db().collection("loginData");
    const user = await loginData.findOne({ _id: loginInfo.id });
    if (user === null || loginInfo.password !== user.password) return null;
    const users = client.db().collection("users");
    const result = await users.findOneAndUpdate(
      { _id: loginInfo.id },
      {
        $set: {
          theme: loginInfo.theme,
          lastActionTime: Date.now(),
          lastAction: "LogInUpdate",
        },
      },
      { returnOriginal: false }
    );
    return result.value;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function authUser(id) {
  try {
    const users = client.db().collection("users");
    const result = await users.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          lastActionTime: Date.now(),
          lastAction: "SessionUpdate",
        },
      },
      { returnOriginal: false }
    );
    return result.value;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function logOut(id) {
  try {
    const users = client.db().collection("users");
    const result = await users.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          lastActionTime: Date.now(),
          lastAction: "LogOut",
        },
      },
      { returnOriginal: false }
    );
    return result.value;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function updateUser(id, userUpdate) {
  try {
    const users = client.db().collection("users");
    const result = await users.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          ...userUpdate,
          lastActionTime: Date.now(),
          lastAction: "Update",
        },
      },
      { returnOriginal: false }
    );
    if (result.ok !== 1) return null;
    return result.value;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function avatars(id) {
  try {
    const avatars = client.db().collection("avatars");
    const user = await avatars.findOne({ _id: id });
    if (user === null) return null;
    return user.avatar;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function updateAvatar(id, avatar) {
  try {
    const avatars = client.db().collection("avatars");
    const result = await avatars.findOneAndUpdate(
      { _id: id },
      {
        $set: { avatar },
      },
      { returnOriginal: false }
    );
    return result.value.avatar;
  } catch (error) {
    console.log(error);
    return null;
  }
}
//lastAction: { $regex: /Update$/ },
async function people(id, filter = "") {
  try {
    const filterTags = filter.toUpperCase();
    const users = client.db().collection("users");
    const filtredPeople = await users
      .find({
        _id: { $ne: id },
        tags: { $regex: filterTags, $options: "i" },
      })
      .sort({ score: -1, mithtruth: 1, lastActionTime: -1 })
      .limit(1000)
      .toArray();
    return filtredPeople;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function getConversation(userID, personid) {
  try {
    const conversations = client.db().collection("conversations");
    const conversation = await conversations.findOne(
      { _id: userID },
      { projection: { _id: 0, [personid]: 1 } }
    );
    return conversation.hasOwnProperty(personid) ? conversation[personid] : [];
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function addMessage(userID, personid, message, currentDate) {
  try {
    const fullMessage = {
      id: `${personid}${currentDate}`,
      from: userID,
      to: personid,
      text: message,
      date: currentDate,
      isSend: true,
      isRead: false,
    };
    const conversations = client.db().collection("conversations");
    const resultUser = await conversations.findOneAndUpdate(
      { _id: userID },
      { $push: { [personid]: fullMessage } },
      { projection: { _id: 0, [personid]: 1 }, returnOriginal: false }
    );
    if (resultUser.ok !== 1) return null;
    const resultPerson = await conversations.updateOne(
      { _id: personid },
      { $push: { [userID]: fullMessage } }
    );
    if (resultPerson.modifiedCount === 0) return null;
    return resultUser.value[personid];
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function deleteMessage(userID, personid, messageid) {
  try {
    const conversations = client.db().collection("conversations");
    const resultUser = await conversations.findOneAndUpdate(
      { _id: userID },
      { $pull: { [personid]: { id: messageid } } },
      { projection: { _id: 0, [personid]: 1 }, returnOriginal: false }
    );
    if (resultUser.ok !== 1) return null;
    return resultUser.value[personid];
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function setMessagesIsRead(userID, personid) {
  try {
    const conversations = client.db().collection("conversations");
    const conversationPerson = await conversations.findOne(
      { _id: personid },
      { projection: { _id: 0, [userID]: 1 } }
    );
    const updatedConversationPerson = conversationPerson[userID].map(
      (message) => {
        if (message.from === personid) {
          return { ...message, isRead: true };
        } else {
          return message;
        }
      }
    );
    await conversations.updateOne(
      { _id: personid },
      { $set: { [userID]: updatedConversationPerson } }
    );
    const conversationUser = await conversations.findOne(
      { _id: userID },
      { projection: { _id: 0, [personid]: 1 } }
    );
    const updatedConversationUser = conversationUser[personid].map(
      (message) => {
        if (message.from === personid) {
          return { ...message, isRead: true };
        } else {
          return message;
        }
      }
    );
    const resultUser = await conversations.findOneAndUpdate(
      { _id: userID },
      { $set: { [personid]: updatedConversationUser } },
      { projection: { _id: 0, [personid]: 1 }, returnOriginal: false }
    );
    if (resultUser.ok !== 1) return null;
    return resultUser.value[personid];
  } catch (error) {
    console.log(error);
    return null;
  }
}

const db = {
  getUserId,
  addUser,
  login,
  authUser,
  logOut,
  updateUser,
  avatars,
  updateAvatar,
  people,
  getConversation,
  addMessage,
  deleteMessage,
  setMessagesIsRead,
};

module.exports = db;
