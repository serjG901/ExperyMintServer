const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const session = require("koa-session");
var Router = require("koa-router");
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
    const users = await getUsers();
    ctx.body = users;
  })
  .post("/isnamefree/", async (ctx, next) => {
    const name = ctx.request.body.name;
    const status = await isNameFree(name);
    ctx.body = { status };
  })
  .post("/login/", async (ctx, next) => {
    const user = {
      name: ctx.request.body.name,
      password: ctx.request.body.password
    };
    const isLogin = await login(user);
    if (isLogin) {
      ctx.session.userID = user.name;
      console.log(ctx.session.userID);
    }
    ctx.body = { isLogin };
  })
  .post("/setuser/", async (ctx, next) => {
    const newUser = {
      name: ctx.request.body.name,
      password: ctx.request.body.password
    };
    const status = await setUser(newUser);
    if (status) {
      ctx.session.userID = newUser.name;
      console.log(ctx.session.userID);
    }
    ctx.body = { status };
  })
  .post("/getuser/", async (ctx, next) => {
    console.log(ctx.session.userID);
    const userID = ctx.session.userID;
    const user = await getUser(userID);
    ctx.body = user;
  })
  .post("/updateuser/", async (ctx, next) => {
    const newUserData = {
      name: ctx.request.body.name,
      avatar: ctx.request.body.avatar,
      results: ctx.request.body.results,
      score: ctx.request.body.score,
      mistruth: ctx.request.body.mistruth,
      manifest: ctx.request.body.manifest,
      tags: ctx.request.body.tags,
      filter: ctx.request.body.filter
    };
    const userID = ctx.session.userID;
    const user = await updateUser(userID, newUserData);
    ctx.body = user;
  })
  .post("/getotherusers/", async (ctx, next) => {
    const filter = ctx.request.body.filter;
    const userID = ctx.session.userID;
    const otherUsers = await getOtherUsers(userID, filter);
    ctx.body = otherUsers;
  })
  .post("/getmessages/", async (ctx, next) => {
    const otherUserID = ctx.request.body.otherUserID;
    const userID = ctx.session.userID;
    const messages = await getMessages(userID, otherUserID);
    ctx.body = { messages };
  })
  .post("/deletemessage/", async (ctx, next) => {
    const messageID = ctx.request.body.messageID;
    const status = await deleteMessage(messageID);
    ctx.body = { status };
  })
  .post("/sendmessage/", async (ctx, next) => {
    const otherUserID = ctx.request.body.otherUserID;
    const message = ctx.request.body.message;
    const currentDate = ctx.request.body.currentDate;
    const userID = ctx.session.userID;
    const status = await sendMessage(userID, otherUserID, message, currentDate);
    ctx.body = { status };
  })
  .post("/setisread/", async (ctx, next) => {
    const messageID = ctx.request.body.messageID;
    const status = await setIsRead(messageID);
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

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
console.log("listening on port 3000");

let loginData = new Map();
let publicData = new Map();
let messagesData = [];

async function isNameFree(name) {
  return !loginData.has(name);
}

async function login({ name, password }) {
  const user = loginData.get(name);
  if (user.password !== password) return false;
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
    avatar: "",
    results: {},
    score: 0,
    mistruth: 0,
    manifest: "",
    tags: "",
    filter: ""
  };
  publicData.set(newUser.name, publicUser);
  return true;
}

async function getUser(userID) {
  const user = publicData.get(userID);
  return user;
}

async function updateUser(userID, newUserData) {
  publicData.set(userID, newUserData);
  const user = publicData.get(userID);
  return user;
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
            avatar: entry[1].avatar,
            tags: entry[1].tags,
            results: entry[1].results
          }
        };
    }
  }
  return otherUsersInfo;
}

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
        results: entry[1].results
      }
    };
  }
  return otherUsersInfo;
}

async function getMessages(userID, otherUserID) {
  const filtredMessages = messagesData.filter(
    (msg) =>
      (msg.from === userID && msg.to === otherUserID) ||
      (msg.from === otherUserID && msg.to === userID)
  );
  return filtredMessages;
}

async function deleteMessage(messageID) {
  messagesData = messagesData.filter((msg) => msg.id !== messageID);
  return true;
}

async function sendMessage(userID, otherUserID, message, currentDate) {
  messagesData = [
    ...messagesData,
    {
      id: [otherUserID, currentDate].join(""),
      from: userID,
      to: otherUserID,
      text: message,
      date: currentDate,
      isSend: true,
      isRead: false
    }
  ];
  return true;
}

async function setIsRead(messageID) {
  messagesData = messagesData.map((msg) =>
    msg.id === messageID ? { ...msg, isRead: true } : msg
  );
  return true;
}

const { MongoClient } = require("mongodb");
const uri =
  "mongodb+srv://db_user_own_way:Ex43joX89@dbEM?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function getLoginData() {
  try {
    await client.connect();
    const database = client.db("ExperyMint");
    const collection = database.collection("loginData");
    const loginData = await collection.find();
    return loginData;
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
