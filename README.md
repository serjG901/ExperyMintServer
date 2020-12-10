# ExperyMintServer - full app ExperyMint.
CRA + tailwindcss + vanilla-tilt + react-router <-> simple js fetch <-> koa2 + mongodb

UI - ExperyMintUI (url - )

Adaptive flex design, 3 main page - account, game, closest people.

16 colors theme. ThemeProvider

3 languages. LanguageProvider

User may register in app with unique name and password.
Unique name - its _id for insert user data in mongodb.
User may change he name in account page, but unique name stay his login name.

User may set tags - info about himself.
User may upload any png/jpg avatar, but avatar resize in  400*400px (max) PNG in base64.

User statistic placed in account and game page.

Game - user see random image, he may rotate image thanks to vanilla-tilt.
User do choice - leave or remove image - it is he result for this image (imageN: true/false), user.score +1.
If in future user see this image and do another choice, he add +1 in fickle (user.mistruth +1).
User statistic: 
- score, 
- fickle, 
- unique - it is computing index, user image choice compare with choice all sorted users (for default they sort by max score, min fickle, min last action date, limited 1000 users, provide by mongodb).

Closest People - it is computing list of person, who closeness for user. User may send message for them.

Server side based in koa2 and mongodb. UI connect to server with simple fetch.

Endpoint:
GET "/userid/:id" - check free user id
PUT "/users/" - add new user
POST "/session/" - login user
GET "/session/" - check user id in session
DELETE "/session/" - log out from session
POST "/users/:id" - update user data
GET "/avatars/:id" - get avatar for any user
PUT "/avatars/:id" - update user avatar
GET "/people/" - get default sorted users
GET "/people/:filter" - get filtred users
GET "/conversations/:personid" - get conversation with person in person list
POST "/conversations/:personid" - add message in conversation
DELETE "/conversations/:personid/messages/:messageid" - delete message in conversation
PUT "/conversations/:personid/messages" - seting not readed messages like readed when user open person.

Find people who are really close to you!


