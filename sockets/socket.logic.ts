import { Socket } from 'socket.io';
import MongoHelper from '../helpers/mongo.helper';
import ENV from '../environments/env';
import TokenHelper from '../helpers/token.helper';

const mongo = MongoHelper.getInstace(ENV.MONGODB);
const tokenHelper = TokenHelper(ENV, mongo);

export default (mongo: any) => {
    return {
        listenSocketConnect: async (socket: Socket) => {
            /*await mongo.db.collection('sockets').insertOne({
                socketId: socket.id,
                usuario: null,
                token: null
            })
            .then((result: any) => console.log(result))
            .catch((error: any) => console.log(error));*/
        },
        signUp: (io: any, socket: Socket) => {
            socket.on('signUp', async (payload: any) => {

                /*await mongo.db.collection('sockets').findOneAndUpdate(
                    { socketId: socket.id },
                    { $set: { usuario: payload.email } }
                )
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));*/

                const response: any = await mongo.db.collection('usuarios').findOne(
                    { correo: payload.email }
                ).then((result: any) => {
                    if (!result) {
                        return { 
                            ok: false, 
                            code: 404
                        }
                    }

                    return {
                        ok: true,
                        code: 200,
                        result
                    }                    

                })
                .catch((error: any) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Failed sign up`,
                        error
                    }
                });

                console.log(response);

                if(response.ok == false){
                    await mongo.db.collection('usuarios').findOneAndUpdate(
                        { correo: payload.email },
                        {
                            $set: {
                                nombreCompleto: payload.fullName,
                                fotoURL: payload.photoUrl,
                                isVerify: false,
                                password: ''
                            }
                        },
                        {
                            upsert: true
                        }
                    )
                    .then((result: any) => { console.log(result); })
                    .catch((error: any) => console.log(error));

                    let getUser = await mongo.db.collection('usuarios').findOne({correo: payload.email});
                    
                    io.emit('returnUserSignIn', getUser);
                }
                else{
                    let messageFailure = `User with the email ${payload.email} already exists.`
                    io.emit('responseSignIn', messageFailure);
                }
            });
        },
        passwordSetup: (io: any, socket: Socket) => {
            socket.on('passwordSetup', async (payload: any) => {

                console.log(payload);

                await mongo.db.collection('usuarios').findOneAndUpdate(
                    { correo: payload.email },
                    {
                        $set: {
                            isVerify: true,
                            password: payload.password
                        }
                    },
                    {
                        upsert: true
                    }
                )
                .then((result: any) => { console.log(result); })
                .catch((error: any) => console.log(error));

                const response: any = await mongo.db.collection('usuarios').findOne(
                    { correo: payload.email, isVerify: true },
                    { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 }}
                )
                .then((result: any) => {
                    if (!result) {
                        return { 
                            ok: false, 
                            code: 404,
                            msg: `Failed setting up password`
                        }
                    }

                    return {
                        ok: true,
                        code: 200,
                        result
                    }                    

                })
                .catch((error: any) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Failed setting up password`,
                        error
                    }
                });
                
                const token: any = await tokenHelper.create(response.result, payload.apiKey);

                await mongo.db.collection('sockets').insertOne({
                    socketId: socket.id,
                    usuario: payload.email,
                    token: token.token
                })
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));

                let returnUser : any[] = [{
                    user: response.result,
                    token: token
                }]; 
                
                io.emit('finishSignIn', returnUser);
            });
        },
        login: async (io: any, socket: Socket) => {
            socket.on('login', async (payload: any) => {

                const response: any = await mongo.db.collection('usuarios').findOne(
                    { correo: payload.email, password: payload.password, isVerify: true },
                    { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 }}
                )
                .then((result: any) => {
                    if (!result) {
                        return { 
                            ok: false, 
                            code: 404,
                            msg: `Failed setting up password`
                        }
                    }

                    return {
                        ok: true,
                        code: 200,
                        result
                    }                    

                })
                .catch((error: any) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Failed setting up password`,
                        error
                    }
                });

                if(response.ok != false){
                    const token: any = await tokenHelper.create(response.result, payload.apiKey);
                    
                    await mongo.db.collection('sockets').insertOne({
                        socketId: socket.id,
                        usuario: payload.email,
                        token: token.token
                    })
                    .then((result: any) => console.log(result))
                    .catch((error: any) => console.log(error));
                    
                    let returnUser : any[] = [{
                        user: response.result,
                        token: token
                    }]; 
                    
                    io.emit('resultLogin', returnUser);
                }
                else{
                    let messageFailure = `Login failed. Please introduce correct email or password.`
                    io.emit('faillogin', messageFailure);
                }
                
            });
        },
        getCurrentUsers: async(io: any, socket: Socket) => {
            socket.on('getConnectedUsers', async () => {

                const response: any = await mongo.db.collection('sockets').find(
                    { socketId: { $ne: socket.id} },
                    { projection: { _id: 0, socketId: 1, usuario: 1, token: 1 }}).toArray()
                .then((result: any) => {
                    if (!result) {
                        return { 
                            ok: false, 
                            code: 404,
                        }
                    }

                    return {
                        ok: true,
                        code: 200,
                        result
                    }                    

                })
                .catch((error: any) => {
                    return {
                        ok: false,
                        code: 500,
                        error
                    }
                });

                let userList: any[] = [];

                for(var i in response.result){

                    const response2: any = await mongo.db.collection('usuarios').findOne(
                        { correo: response.result[i].usuario },
                        { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 }}
                    )
                    .then((result: any) => {
                        if (!result) {
                            return { 
                                ok: false, 
                                code: 404,
                            }
                        }
    
                        return {
                            ok: true,
                            code: 200,
                            result
                        }                    
    
                    })
                    .catch((error: any) => {
                        return {
                            ok: false,
                            code: 500,
                            error
                        }
                    });

                    userList.push({
                        correo: response2.result.correo,
                        fotoURL: response2.result.fotoURL,
                        nombreCompleto: response2.result.nombreCompleto
                    });
                }

                io.emit('returnUserList', userList);
            });
        },
        message: async (socket: Socket) => {
            socket.on('message', async (payload: any) => {

                var ts_hms = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') 
                console.log(ts_hms);

                await mongo.db.collection('chat').insertOne({
                    userSender: payload.usersender,
                    userReceiver: payload.userreceiver,
                    msgDate: ts_hms,
                    message: payload.msg
                })
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));
            });
        },
        getChatMessages: async(io: any, socket: Socket) => {
            socket.on('getChatMessages', async (payload: any) => {

                const response: any = await mongo.db.collection('chat').find(
                    { $or: [
                        {userSender: payload.usersender, userReceiver: payload.userreceiver}, 
                        {userSender: payload.userreceiver, userReceiver: payload.usersender}] 
                    })
                    .sort({msgDate: 1})
                    .toArray()
                    .then((result: any) => {
                        if (!result) {
                            return { 
                                ok: false, 
                                code: 404,
                            }
                        }
                        
                        return {
                            ok: true,
                            code: 200,
                            result
                        }                    
                    })
                    .catch((error: any) => {
                        return {
                            ok: false,
                            code: 500,
                            error
                        }
                    });

                let chatMessages: any[] = [];
                chatMessages = response.result;
                console.log(chatMessages);
                io.emit('returnChat', chatMessages);
            });
        },
        logout: async (socket: Socket) => {
            socket.on('logout', async () => {
                await mongo.db.collection('sockets')
                .remove({socketId: socket.id})
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));
            });   
        },
        disconnect: (socket: Socket) => {
            socket.on('disconnect', async () => {
                console.log(`Desconexión del cliente con ID: ${socket.id}`);

                // Eliminar socket desconectado
                await mongo.db.collection('sockets')
                .remove({socketId: socket.id})
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));

                //To Do Guardar Log en Base de datos
            });
        }
    }
}