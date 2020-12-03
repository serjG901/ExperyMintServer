const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const session = require("koa-session");
const Router = require("koa-router");
const serve = require("koa-static");
const mount = require("koa-mount");

const app = new Koa();

app.keys = ["nemnogo raznie cluchi!"];

const CONFIG = {
  key: "wery big key" /** (string) cookie key (default is koa.sess) */,
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  autoCommit: true /** (boolean) automatically commit headers (default true) */,
  overwrite: true /** (boolean) can overwrite or not (default true) */,
  httpOnly: true /** (boolean) httpOnly or not (default true) */,
  signed: true /** (boolean) signed or not (default true) */,
  rolling: false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
  renew: false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
  secure: false /** (boolean) secure cookie*/,
  sameSite: null /** (string) session cookie sameSite options (default null, don't set it) */
};

app.use(session(CONFIG, app));
app.use(bodyParser());

const router = new Router();

router
  .get("/getall", async (ctx, next) => {
    const users = await getUsersDB();
    ctx.body = users;
  })
  .get("/getallmessages", async (ctx, next) => {
    const messages = await getAllMessagesDB();
    ctx.body = messages;
  })
  .post("/isnamefree/", async (ctx, next) => {
    const name = ctx.request.body.name;
    const status = await isNameFreeDB(name);
    ctx.body = { status };
  })
  .post("/login/", async (ctx, next) => {
    const user = {
      name: ctx.request.body.name,
      password: ctx.request.body.password,
      lastUpdate: ctx.request.body.lastUpdate
    };
    const isLogin = await loginDB(user);
    if (isLogin) {
      ctx.session.userID = user.name;
    }
    ctx.body = { isLogin };
  })
  .post("/isloggedin/", async (ctx, next) => {
    const status = ctx.session.userID ? true : false;
    ctx.body = { status };
  })
  .post("/tologgedout/", async (ctx, next) => {
    ctx.session.userID = null;
    const status = true;
    ctx.body = { status };
  })
  .post("/setuser/", async (ctx, next) => {
    const newUser = {
      name: ctx.request.body.name,
      password: ctx.request.body.password,
      lastUpdate: ctx.request.body.lastUpdate
    };
    const status = await setUserDB(newUser);
    if (status) {
      ctx.session.userID = newUser.name;
    }
    ctx.body = { status };
  })
  .post("/getuser/", async (ctx, next) => {
    const userID = ctx.session.userID;
    const user = await getUserDB(userID);
    ctx.body = user;
  })
  .post("/updateuser/", async (ctx, next) => {
    const newUserData = {
      name: ctx.request.body.name,
      results: ctx.request.body.results,
      score: ctx.request.body.score,
      mistruth: ctx.request.body.mistruth,
      manifest: ctx.request.body.manifest,
      tags: ctx.request.body.tags,
      filter: ctx.request.body.filter,
      lastUpdate: ctx.request.body.lastUpdate
    };
    const userID = ctx.session.userID;
    const status = await updateUserDB(userID, newUserData);
    ctx.body = { status };
  })
  .post("/setavatarserve/", async (ctx, next) => {
    const userID = ctx.session.userID;
    const newAvatar = ctx.request.body.avatar;
    const status = await setAvatarServeDB(userID, newAvatar);
    ctx.body = { status };
  })
  .post("/getavatar/", async (ctx, next) => {
    const userID = ctx.session.userID;
    const avatar = await getAvatarDB(userID);
    ctx.body = { avatar };
  })
  .post("/getotherusers/", async (ctx, next) => {
    const filter = ctx.request.body.filter;
    const userID = ctx.session.userID;
    const otherUsers = await getOtherUsersDB(userID, filter);
    ctx.body = otherUsers;
  })
  .post("/getotheruser/", async (ctx, next) => {
    const otherUserID = ctx.request.body.otherUserID;
    const otherUser = await getOtherUserDB(otherUserID);
    ctx.body = otherUser;
  })
  .post("/getotheravatar/", async (ctx, next) => {
    const userID = ctx.request.body.otherUserID;
    const avatar = await getAvatarDB(userID);
    ctx.body = { avatar };
  })
  .post("/getmessages/", async (ctx, next) => {
    const otherUserID = ctx.request.body.otherUserID;
    const userID = ctx.session.userID;
    const messages = await getMessagesDB(userID, otherUserID);
    ctx.body = { messages };
  })
  .post("/deletemessage/", async (ctx, next) => {
    const userID = ctx.session.userID;
    const otherUserID = ctx.request.body.otherUserID;
    const messageID = ctx.request.body.messageID;
    const status = await deleteMessageDB(userID, otherUserID, messageID);
    ctx.body = { status };
  })
  .post("/sendmessage/", async (ctx, next) => {
    const otherUserID = ctx.request.body.otherUserID;
    const message = ctx.request.body.message;
    const currentDate = ctx.request.body.currentDate;
    const userID = ctx.session.userID;
    const status = await sendMessageDB(
      userID,
      otherUserID,
      message,
      currentDate
    );
    ctx.body = { status };
  })
  .post("/setisread/", async (ctx, next) => {
    const userID = ctx.session.userID;
    const otherUserID = ctx.request.body.otherUserID;
    const messageID = ctx.request.body.messageID;
    const status = await setIsReadDB(userID, otherUserID, messageID);
    ctx.body = { status };
  })
  .put("/users/:id", (ctx, next) => {
    // ...
  })
  .del("/users/:id", (ctx, next) => {
    // ...
  })
  .all("/users/:id", (ctx, next) => {
    // ...
  });

app.use(mount("/", serve("./build")));
app.use(mount("/account", serve("./build")));
app.use(mount("/game", serve("./build")));
app.use(mount("/chat", serve("./build")));

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
console.log("listening on port 3000");

//-----local letters

let loginData = new Map();
let publicData = new Map();
let avatarData = new Map();
let messagesData = new Map();

async function getUsers() {
  let otherUsersInfo = {};
  for (let entry of publicData) {
    otherUsersInfo = {
      ...otherUsersInfo,
      [entry[0]]: {
        name: entry[1].name,
        manifest: entry[1].manifest,
        filter: entry[1].filter,
        tags: entry[1].tags,
        score: entry[1].score,
        mistruth: entry[1].mistruth,
        lastUpdate: entry[1].lastUpdate,
        results: entry[1].results
      }
    };
  }
  return otherUsersInfo;
}

async function isNameFree(name) {
  return !loginData.has(name);
}

async function login({ name, password, lastUpdate }) {
  const user = loginData.get(name);
  if (user.password !== password) return false;
  const userOld = publicData.get(name);
  publicData.set(name, { ...userOld, lastUpdate });
  return true;
}

async function setUser(newUser) {
  if (loginData.has(newUser.name)) return false;
  loginData.set(newUser.name, {
    name: newUser.name,
    password: newUser.password
  });
  const publicUser = {
    name: newUser.name,
    results: {},
    score: 0,
    mistruth: 0,
    manifest: "",
    tags: "",
    filter: "",
    lastUpdate: newUser.lastUpdate
  };
  publicData.set(newUser.name, publicUser);
  avatarData.set(newUser.name, { avatar: null });
  messagesData.set(newUser.name, {});
  return true;
}

async function getUser(userID) {
  const user = publicData.get(userID);
  return user;
}

async function updateUser(userID, newUserData) {
  publicData.set(userID, newUserData);
  return true;
}

async function getAvatar(userID) {
  const userAvatar = avatarData.get(userID);
  return userAvatar.avatar;
}

async function setAvatarServe(userID, avatar) {
  avatarData.set(userID, { avatar });
  return true;
}

async function getOtherUsers(userID, filter) {
  let otherUsersInfo = {};
  const filterTags = filter ? filter.toLowerCase() : "";
  for (let entry of publicData) {
    if (entry[0] !== userID) {
      if (entry[1]["tags"].toLowerCase().indexOf(filterTags) !== -1)
        otherUsersInfo = {
          ...otherUsersInfo,
          [entry[0]]: {
            name: entry[1].name,
            manifest: entry[1].manifest,
            mistruth: entry[1].mistruth,
            tags: entry[1].tags,
            lastUpdate: entry[1].lastUpdate,
            results: entry[1].results
          }
        };
    }
  }
  return otherUsersInfo;
}

async function getOtherUser(otherUserID) {
  const otherUserAll = publicData.get(otherUserID);
  const otherUser = {
    name: otherUserAll.name,
    manifest: otherUserAll.manifest,
    mistruth: otherUserAll.mistruth,
    tags: otherUserAll.tags,
    lastUpdate: otherUserAll.lastUpdate
  };
  return otherUser;
}

async function getAllMessages() {
  let messages = {};
  for (let entry of messagesData) {
    messages = {
      ...messages,
      [entry[0]]: entry[1]
    };
  }
  return messages;
}

async function getMessages(userID, otherUserID) {
  const messagesOfUser = messagesData.get(userID);
  const messages = messagesOfUser.hasOwnProperty(otherUserID)
    ? messagesOfUser[otherUserID]
    : [];
  return messages;
}

async function sendMessage(userID, otherUserID, message, currentDate) {
  const fullMessage = {
    id: [otherUserID, currentDate].join(""),
    from: userID,
    to: otherUserID,
    text: message,
    date: currentDate,
    isSend: true,
    isRead: false
  };
  const messagesOfUser = messagesData.get(userID);
  const userMessages = messagesOfUser.hasOwnProperty(otherUserID)
    ? messagesOfUser[otherUserID]
    : [];
  messagesData.set(userID, {
    ...messagesOfUser,
    [otherUserID]: [...userMessages, { ...fullMessage }]
  });
  const messagesOfOtherUser = messagesData.get(otherUserID);
  const otherUserMessages = messagesOfOtherUser.hasOwnProperty(userID)
    ? messagesOfOtherUser[userID]
    : [];
  messagesData.set(otherUserID, {
    ...messagesOfOtherUser,
    [userID]: [...otherUserMessages, { ...fullMessage }]
  });
  return true;
}

async function setIsRead(userID, otherUserID, messageID) {
  const messagesOfUser = messagesData.get(userID);
  const userMessages = messagesOfUser[otherUserID];
  const newUserMessages = userMessages.map((message) =>
    message.id === messageID ? { ...message, isRead: true } : message
  );
  messagesData.set(userID, {
    ...messagesOfUser,
    [otherUserID]: newUserMessages
  });
  const messagesOfOtherUser = messagesData.get(otherUserID);
  const otherUserMessages = messagesOfOtherUser[userID];
  const newOtherUserMessages = otherUserMessages.map((message) =>
    message.id === messageID ? { ...message, isRead: true } : message
  );
  messagesData.set(otherUserID, {
    ...messagesOfOtherUser,
    [userID]: newOtherUserMessages
  });
  return true;
}

async function deleteMessage(userID, otherUserID, messageID) {
  const messagesOfUser = messagesData.get(userID);
  const userMessages = messagesOfUser[otherUserID];
  const newUserMessages = userMessages.filter(
    (message) => message.id !== messageID
  );
  messagesData.set(userID, {
    ...messagesOfUser,
    [otherUserID]: newUserMessages
  });
  const messagesOfOtherUser = messagesData.get(otherUserID);
  const otherUserMessages = messagesOfOtherUser[userID];
  const newOtherUserMessages = otherUserMessages.filter(
    (message) => message.id !== messageID
  );
  messagesData.set(otherUserID, {
    ...messagesOfOtherUser,
    [userID]: newOtherUserMessages
  });
  return true;
}

//--------mongoDB

const MongoClient = require("mongodb").MongoClient;
const uri =
  "mongodb+srv://db_user_own_way:W8N6DfCP9vtwR78y@dbem.jkmxa.mongodb.net/ExperyMint?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useUnifiedTopology: true });
client.connect();

async function getUsersDB() {
  let usersInfo = {};
  const publicData = client.db().collection("publicData");
  const users = await publicData.find({});
  await users.forEach((user) => {
    usersInfo = {
      ...usersInfo,
      [user._id]: {
        name: user.name,
        manifest: user.manifest,
        filter: user.filter,
        tags: user.tags,
        score: user.score,
        mistruth: user.mistruth,
        lastUpdate: user.lastUpdate,
        results: user.results
      }
    };
  });
  users.close();
  return usersInfo;
}

async function getAllMessagesDB() {
  let messages = {};
  const messagesData = client.db().collection("messagesData");
  const allMessages = await messagesData.find({});
  await allMessages.forEach((userMessages) => {
    messages = {
      ...messages,
      [userMessages._id]: {
        userMessages
      }
    };
  });
  allMessages.close();
  return messages;
}

async function isNameFreeDB(name) {
  const loginData = client.db().collection("loginData");
  const user = await loginData.findOne({ _id: name });
  const isNameFree = user === null ? true : false;
  return isNameFree;
}

async function loginDB({ name, password, lastUpdate }) {
  const loginData = client.db().collection("loginData");
  const user = await loginData.findOne({ _id: name });
  if (user.password !== password) return false;
  const publicData = client.db().collection("publicData");
  await publicData.updateOne(
    { _id: name },
    {
      $set: { lastUpdate }
    }
  );
  return true;
}

async function setUserDB(newUser) {
  const loginData = client.db().collection("loginData");
  const user = await loginData.findOne({ _id: newUser.name });
  const isNameFree = user === null ? true : false;
  if (!isNameFree) return false;
  loginData.insertOne({ _id: newUser.name, password: newUser.password });
  const publicUser = {
    name: newUser.name,
    results: {},
    score: 0,
    mistruth: 0,
    manifest: "",
    tags: "",
    filter: "",
    lastUpdate: newUser.lastUpdate
  };
  const publicData = client.db().collection("publicData");
  await publicData.insertOne({ _id: newUser.name, ...publicUser });
  const avatarData = client.db().collection("avatarData");
  await avatarData.insertOne({ _id: newUser.name, avatar: null });
  const messagesData = client.db().collection("messagesData");
  await messagesData.insertOne({ _id: newUser.name });
  return true;
}

async function getUserDB(userID) {
  const publicData = client.db().collection("publicData");
  const user = await publicData.findOne(
    { _id: userID },
    { projection: { _id: 0 } }
  );
  return user;
}

async function updateUserDB(userID, newUserData) {
  const publicData = client.db().collection("publicData");
  await publicData.updateOne(
    { _id: userID },
    {
      $set: { ...newUserData }
    }
  );
  return true;
}

async function getAvatarDB(userID) {
  const avatarData = client.db().collection("avatarData");
  const user = await avatarData.findOne({ _id: userID });
  return user.avatar;
}

async function setAvatarServeDB(userID, avatar) {
  const avatarData = client.db().collection("avatarData");
  await avatarData.updateOne(
    { _id: userID },
    {
      $set: { avatar }
    }
  );
  return true;
}

async function getOtherUsersDB(userID, filter) {
  let otherUsersInfo = {};
  const filterTags = filter ? filter.toLowerCase() : "";
  const publicData = client.db().collection("publicData");
  const users = await publicData.find({});
  await users.forEach((user) => {
    if (user._id !== userID) {
      if (user.tags.toLowerCase().indexOf(filterTags) !== -1)
        otherUsersInfo = {
          ...otherUsersInfo,
          [user._id]: {
            name: user.name,
            manifest: user.manifest,
            mistruth: user.mistruth,
            tags: user.tags,
            lastUpdate: user.lastUpdate,
            results: user.results
          }
        };
    }
  });
  users.close();
  return otherUsersInfo;
}

async function getOtherUserDB(otherUserID) {
  const publicData = client.db().collection("publicData");
  const otherUser = await publicData.findOne(
    { _id: otherUserID },
    {
      projection: {
        _id: 0,
        name: 1,
        manifest: 1,
        mistruth: 1,
        tags: 1,
        lastUpdate: 1
      }
    }
  );
  return otherUser;
}

async function getMessagesDB(userID, otherUserID) {
  const messagesData = client.db().collection("messagesData");
  const messages = await messagesData.findOne(
    { _id: userID },
    { projection: { _id: 0, [otherUserID]: 1 } }
  );
  return messages.hasOwnProperty(otherUserID) ? messages[otherUserID] : [];
}

async function sendMessageDB(userID, otherUserID, message, currentDate) {
  const fullMessage = {
    id: [otherUserID, currentDate].join(""),
    from: userID,
    to: otherUserID,
    text: message,
    date: currentDate,
    isSend: true,
    isRead: false
  };
  const messagesData = client.db().collection("messagesData");
  const userMessages = await messagesData.findOne(
    { _id: userID },
    { projection: { _id: 0, [otherUserID]: 1 } }
  );
  const userNewMessages = userMessages.hasOwnProperty(otherUserID)
    ? [...userMessages[otherUserID], fullMessage]
    : [fullMessage];
  await messagesData.updateOne(
    { _id: userID },
    {
      $set: { [otherUserID]: userNewMessages }
    }
  );
  const otherUserMessages = await messagesData.findOne(
    { _id: otherUserID },
    { projection: { _id: 0, [userID]: 1 } }
  );
  const otherUserNewMessages = userMessages.hasOwnProperty(userID)
    ? [...otherUserMessages[userID], fullMessage]
    : [fullMessage];
  await messagesData.updateOne(
    { _id: otherUserID },
    {
      $set: { [userID]: otherUserNewMessages }
    }
  );
  return true;
}

async function setIsReadDB(userID, otherUserID, messageID) {
  const messagesData = client.db().collection("messagesData");
  const userMessages = await messagesData.findOne(
    { _id: userID },
    { projection: { _id: 0, [otherUserID]: 1 } }
  );
  const userNewMessages = userMessages[otherUserID].map((message) =>
    message.id === messageID ? { ...message, isRead: true } : message
  );
  await messagesData.updateOne(
    { _id: userID },
    {
      $set: { [otherUserID]: userNewMessages }
    }
  );
  const otherUserMessages = await messagesData.findOne(
    { _id: otherUserID },
    { projection: { _id: 0, [userID]: 1 } }
  );
  const newOtherUserMessages = otherUserMessages[userID].map((message) =>
    message.id === messageID ? { ...message, isRead: true } : message
  );
  await messagesData.updateOne(
    { _id: otherUserID },
    {
      $set: { [userID]: newOtherUserMessages }
    }
  );
  return true;
}

async function deleteMessageDB(userID, otherUserID, messageID) {
  const messagesData = client.db().collection("messagesData");
  const userMessages = await messagesData.findOne(
    { _id: userID },
    { projection: { _id: 0, [otherUserID]: 1 } }
  );
  const userNewMessages = userMessages[otherUserID].filter(
    (message) => message.id !== messageID
  );
  await messagesData.updateOne(
    { _id: userID },
    {
      $set: { [otherUserID]: userNewMessages }
    }
  );
  const otherUserMessages = await messagesData.findOne(
    { _id: otherUserID },
    { projection: { _id: 0, [userID]: 1 } }
  );
  const newOtherUserMessages = otherUserMessages[userID].filter(
    (message) => message.id !== messageID
  );
  await messagesData.updateOne(
    { _id: otherUserID },
    {
      $set: { [userID]: newOtherUserMessages }
    }
  );
  return true;
}
