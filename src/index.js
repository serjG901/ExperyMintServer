const db = require("./db");
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const session = require("koa-session");
const Router = require("koa-router");
const serve = require("koa-static");
const mount = require("koa-mount");
const send = require("koa-send");
const queryString = require("query-string");

const app = new Koa();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit("error", err, ctx);
  }
});

app.keys = ["nemnogo raznie cluchi!"];

const CONFIG = { key: "wery big key" };

app.use(session(CONFIG, app));
app.use(bodyParser());

const router = new Router();

router
  .get("/userid/:id", async (ctx) => {
    const id = await db.getUserId(ctx.params.id);
    ctx.body = { id };
  })
  .put("/users/", async (ctx) => {
    const newUser = {
      id: ctx.request.body.id,
      password: ctx.request.body.password,
      theme: ctx.request.body.theme,
    };
    const user = await db.addUser(newUser);
    if (user !== null) {
      ctx.session.userID = ctx.request.body.id;
    }
    ctx.body = { user };
  })
  .post("/session/", async (ctx) => {
    const loginInfo = {
      id: ctx.request.body.id,
      password: ctx.request.body.password,
      theme: ctx.request.body.theme,
    };
    const user = await db.login(loginInfo);
    if (user !== null) {
      ctx.session.userID = ctx.request.body.id;
    }
    ctx.body = { user };
  })
  .get("/session/", async (ctx) => {
    const authUser =
      ctx.session.userID === undefined || ctx.session.userID === null
        ? null
        : await db.authUser(ctx.session.userID);
    ctx.body = { authUser };
  })
  .del("/session/", async (ctx) => {
    await db.logOut(ctx.session.userID);
    ctx.session.userID = null;
    ctx.body = { logOutUser: null };
  })
  .post("/users/:id", async (ctx) => {
    if (ctx.session.userID !== ctx.params.id)
      throw new ForbidenError("You do not have access to the resource");
    const userUpdate = ctx.request.body;
    const updatedUser = await db.updateUser(ctx.session.userID, userUpdate);
    ctx.body = { updatedUser };
  })
  .get("/avatars/:id", async (ctx) => {
    const avatar = await db.avatars(ctx.params.id);
    ctx.body = { avatar };
  })
  .put("/avatars/:id", async (ctx) => {
    if (ctx.session.userID !== ctx.params.id)
      throw new ForbidenError("You do not have access to the resource");
    const updatedAvatar = await db.updateAvatar(
      ctx.session.userID,
      ctx.request.body.avatar
    );
    ctx.body = { updatedAvatar };
  })
  .get("/people", async (ctx) => {
    const url = queryString.parseUrl(ctx.request.href);
    const filter = url.query.filter;
    const filtredPeople = await db.people(ctx.session.userID, filter);
    ctx.body = { people: filtredPeople };
  })
  .get("/conversations/:personid", async (ctx) => {
    const conversation = await db.getConversation(
      ctx.session.userID,
      ctx.params.personid
    );
    ctx.body = { conversation };
  })
  .post("/conversations/:personid", async (ctx) => {
    const conversation = await db.addMessage(
      ctx.session.userID,
      ctx.params.personid,
      ctx.request.body.message,
      ctx.request.body.currentDate
    );
    ctx.body = { conversation };
  })
  .del("/conversations/:personid/messages/:messageid", async (ctx) => {
    const conversation = await db.deleteMessage(
      ctx.session.userID,
      ctx.params.personid,
      ctx.params.messageid
    );
    ctx.body = { conversation };
  })
  .put("/conversations/:personid/messages", async (ctx) => {
    const messages = await db.setMessagesIsRead(
      ctx.session.userID,
      ctx.params.personid
    );
    ctx.body = { messages };
  });

app.use(router.routes()).use(router.allowedMethods());

app.use(mount("/", serve("./build")));

app.use(async (ctx) => {
  await send(ctx, "./build/index.html");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on port ${port}`));

class ForbidenError extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
    Error.captureStackTrace(this, this.constructor);
  }
}
