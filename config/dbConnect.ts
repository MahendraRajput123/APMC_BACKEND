// import mongoose from "mongoose";

// const ConnectDb = async () => {
//   try {
//     const connect = await mongoose.connect(process.env.CONNECTION_STRING ?? '');
//     console.log(
//       `Database connected`,
//       connect.connection.host,
//       connect.connection.name
//     );
//   } catch (error) {
//     console.log(error);
//     process.exit(1);
//   }
// };

// export default ConnectDb;

import mysql from 'mysql2/promise';

const ConnectDb = async () => {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '123$AAaa',
      database: 'APMC',
      port: 3306,
    });

    console.log('Connected to MySQL database as id ' + connection.threadId);
    return connection;
  } catch (error) {
    console.error('Error connecting to MySQL database:', error);
    throw error;
  }
};

export default ConnectDb;