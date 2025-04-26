const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const http = require('http');
const socketServer = require('./socketServer.js');
// process.on("uncaughtException", (err) => {
//   console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
//   console.log(err.name, err.message);
//   process.exit(1);
// });

dotenv.config({ path: './.env' });
const app = require('./app');
const { Socket } = require('dgram');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful!'));
// mongoose
//   .connect(DB, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3001;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// socket io
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.BASE_URL.split('/api/v1')[0],
  },
});

io.on('connection', (socket) => {
  console.log('Socket io connected successfully');
  socketServer(socket, io);
});
// process.on("unhandledRejection", (err) => {
//   console.log("UNHANDLED REJECTION! 💥 Shutting down...");
//   console.log(err.name, err.message);
//   server.close(() => {
//     process.exit(1);
//   });
// });

// process.on("SIGTERM", () => {
//   console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
//   server.close(() => {
//     console.log("💥 Process terminated!");
//   });
// });