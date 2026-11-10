import { openDatabase } from './database/connection.js';
import { initializeDatabase } from './database/init.js';
import { createApp } from './app.js';

const port=Number(process.env.PORT)||3000;
let db;
try { db=openDatabase(); initializeDatabase(db); }
catch(error){ console.error('Unable to initialize the database:',error.message);process.exit(1); }
const server=createApp(db).listen(port,()=>console.log(`StockPilot running at http://localhost:${port}`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
