import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import { Socket } from 'socket.io';
import MongoHelper from './helpers/mongo.helper';
import SocketLogic from './sockets/socket.logic';
import ENV from './environments/env';
import TokenHelper from './helpers/token.helper';

const mongo = MongoHelper.getInstace(ENV.MONGODB);
const tokenHelper = TokenHelper(ENV, mongo);

(async() => {
    await mongo.connect(ENV.MONGODB.DATABASE);
    if (mongo.statusConnection.status == 'success'){

        console.log(`Conexión exitosa a MongoDB en el puerto ${ENV.MONGODB.PORT}`);

        // Correr Express
        const app = express();
        app.use(express.json());
        app.use(compression());

        let whitelist = ['http://localhost:4200'];

        app.use(cors({ 
            origin: (origin, callback) => {
                // allow requests with no origin
                if(!origin) return callback(null, true);
                if(whitelist.indexOf(origin) === -1) {
                    var message = `The CORS policy for this origin doesn't follow access from the particular origin.`;
                    return callback(new Error(message), true);
                }
                return callback(null, true);
            },
        }));

        //app.use(cors({origin:true, credentials: true}));

        app.get('/', (req: Request, res: Response) => {
            res.status(200).json({
                ok: true,
                msg: 'API Real-Time funcionando correctamente'
            });
        })

        app.post('/loginOAuth2', async (req: Request, res: Response) => {
            const { correo, apiKey } = req.body;

            console.log('Evaluar REQ.BODY =====>', correo);

            const response: any = await mongo.db.collection('usuarios')
                .findOne(
                    { correo, isVerify: true },
                    { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 }}
                )
                .then((result: any) => {

                    console.log('EVALUAR RESULT =====>', result);

                    if (!result) {
                        return { 
                            ok: false, 
                            code: 404,
                            msg: `Lo sentimos, el usuario ${correo} no se ha registrado aún o bien no ha habilitado su acceso`}
                    }

                    return {
                        ok: true,
                        code: 200,
                        msg: `Inicio de sesión realizado de forma exitosa para el usuario ${correo}`,
                        result
                    }                    

                })
                .catch((error: any) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Ocurrio un error no contemplado al iniciar sesión con el usuario ${correo}`,
                        error
                    }
                });

            console.log('Login ======>', response);
            
            if (response.ok == false) {
                res.status(response.code).json(response);
            } else {
                // Solicitar Token para usuario
                const token: any = await tokenHelper.create(response.result, apiKey);
                res.status(response.code).json(token);
            }
        })

        const httpServer = http.createServer(app);
        //const socketIO = require('socket.io')(httpServer);

        const socketIO = require('socket.io')(httpServer, {
            cors: {
                origin: "http://localhost:4200",
                credentials: true,
            },
            allowEIO3: true
        });

        //Funcionalidad Real-Time
        const socketLogic = SocketLogic(mongo);

        socketIO.on('connection', (socket: Socket) => {
            // TO DO: Lógica Real-Time
            console.log(`Nuevo cliente conectado con ID: ${socket.id}`);

            //Socket Connect
            socketLogic.listenSocketConnect(socket);

            // Logic SignUp
            socketLogic.signUp(socketIO, socket);

            // Logic Disconnect
            socketLogic.disconnect(socket);
        });

        httpServer.listen(ENV.API.PORT, () => {
            console.log(`Servidor Express funcionando correctamente en puerto ${ENV.API.PORT}`);
        });
    } else {
        console.log('No se pudo realizar la conexión a la base de datos.');
    }
})();

// Handle Errors
process.on('unhandleRejection', (error: any, promise) => {
    console.log(`Ocurrio un error no controlado de tipo promise rejection `, promise);
    console.log(`La descripción de error es la siguiente: `, error);
    //Close Mongo
    mongo.disconnect();
    process.exit();
})


