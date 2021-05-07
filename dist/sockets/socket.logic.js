"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongo_helper_1 = __importDefault(require("../helpers/mongo.helper"));
const env_1 = __importDefault(require("../environments/env"));
const token_helper_1 = __importDefault(require("../helpers/token.helper"));
const mongo = mongo_helper_1.default.getInstace(env_1.default.MONGODB);
const tokenHelper = token_helper_1.default(env_1.default, mongo);
exports.default = (mongo) => {
    return {
        listenSocketConnect: (socket) => __awaiter(void 0, void 0, void 0, function* () {
            /*await mongo.db.collection('sockets').insertOne({
                socketId: socket.id,
                usuario: null,
                token: null
            })
            .then((result: any) => console.log(result))
            .catch((error: any) => console.log(error));*/
        }),
        signUp: (io, socket) => {
            socket.on('signUp', (payload) => __awaiter(void 0, void 0, void 0, function* () {
                /*await mongo.db.collection('sockets').findOneAndUpdate(
                    { socketId: socket.id },
                    { $set: { usuario: payload.email } }
                )
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));*/
                const response = yield mongo.db.collection('usuarios').findOne({ correo: payload.email }).then((result) => {
                    if (!result) {
                        return {
                            ok: false,
                            code: 404
                        };
                    }
                    return {
                        ok: true,
                        code: 200,
                        result
                    };
                })
                    .catch((error) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Failed sign up`,
                        error
                    };
                });
                console.log(response);
                if (response.ok == false) {
                    yield mongo.db.collection('usuarios').findOneAndUpdate({ correo: payload.email }, {
                        $set: {
                            nombreCompleto: payload.fullName,
                            fotoURL: payload.photoUrl,
                            isVerify: false,
                            password: ''
                        }
                    }, {
                        upsert: true
                    })
                        .then((result) => { console.log(result); })
                        .catch((error) => console.log(error));
                    let getUser = yield mongo.db.collection('usuarios').findOne({ correo: payload.email });
                    io.emit('returnUserSignIn', getUser);
                }
                else {
                    let messageFailure = `User with the email ${payload.email} already exists.`;
                    io.emit('responseSignIn', messageFailure);
                }
            }));
        },
        passwordSetup: (io, socket) => {
            socket.on('passwordSetup', (payload) => __awaiter(void 0, void 0, void 0, function* () {
                console.log(payload);
                yield mongo.db.collection('usuarios').findOneAndUpdate({ correo: payload.email }, {
                    $set: {
                        isVerify: true,
                        password: payload.password
                    }
                }, {
                    upsert: true
                })
                    .then((result) => { console.log(result); })
                    .catch((error) => console.log(error));
                const response = yield mongo.db.collection('usuarios').findOne({ correo: payload.email, isVerify: true }, { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 } })
                    .then((result) => {
                    if (!result) {
                        return {
                            ok: false,
                            code: 404,
                            msg: `Failed setting up password`
                        };
                    }
                    return {
                        ok: true,
                        code: 200,
                        result
                    };
                })
                    .catch((error) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Failed setting up password`,
                        error
                    };
                });
                const token = yield tokenHelper.create(response.result, payload.apiKey);
                yield mongo.db.collection('sockets').insertOne({
                    socketId: socket.id,
                    usuario: payload.email,
                    token: token.token
                })
                    .then((result) => console.log(result))
                    .catch((error) => console.log(error));
                let returnUser = [{
                        user: response.result,
                        token: token
                    }];
                io.emit('finishSignIn', returnUser);
            }));
        },
        login: (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
            socket.on('login', (payload) => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield mongo.db.collection('usuarios').findOne({ correo: payload.email, password: payload.password, isVerify: true }, { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 } })
                    .then((result) => {
                    if (!result) {
                        return {
                            ok: false,
                            code: 404,
                            msg: `Failed setting up password`
                        };
                    }
                    return {
                        ok: true,
                        code: 200,
                        result
                    };
                })
                    .catch((error) => {
                    return {
                        ok: false,
                        code: 500,
                        msg: `Failed setting up password`,
                        error
                    };
                });
                if (response.ok != false) {
                    const token = yield tokenHelper.create(response.result, payload.apiKey);
                    yield mongo.db.collection('sockets').insertOne({
                        socketId: socket.id,
                        usuario: payload.email,
                        token: token.token
                    })
                        .then((result) => console.log(result))
                        .catch((error) => console.log(error));
                    let returnUser = [{
                            user: response.result,
                            token: token
                        }];
                    io.emit('resultLogin', returnUser);
                }
                else {
                    let messageFailure = `Login failed. Please introduce correct email or password.`;
                    io.emit('faillogin', messageFailure);
                }
            }));
        }),
        getCurrentUsers: (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
            socket.on('getConnectedUsers', () => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield mongo.db.collection('sockets').find({ socketId: { $ne: socket.id } }, { projection: { _id: 0, socketId: 1, usuario: 1, token: 1 } }).toArray()
                    .then((result) => {
                    if (!result) {
                        return {
                            ok: false,
                            code: 404,
                        };
                    }
                    return {
                        ok: true,
                        code: 200,
                        result
                    };
                })
                    .catch((error) => {
                    return {
                        ok: false,
                        code: 500,
                        error
                    };
                });
                let userList = [];
                for (var i in response.result) {
                    const response2 = yield mongo.db.collection('usuarios').findOne({ correo: response.result[i].usuario }, { projection: { _id: 0, correo: 1, fotoURL: 1, nombreCompleto: 1 } })
                        .then((result) => {
                        if (!result) {
                            return {
                                ok: false,
                                code: 404,
                            };
                        }
                        return {
                            ok: true,
                            code: 200,
                            result
                        };
                    })
                        .catch((error) => {
                        return {
                            ok: false,
                            code: 500,
                            error
                        };
                    });
                    userList.push({
                        correo: response2.result.correo,
                        fotoURL: response2.result.fotoURL,
                        nombreCompleto: response2.result.nombreCompleto
                    });
                }
                io.emit('returnUserList', userList);
            }));
        }),
        message: (socket) => __awaiter(void 0, void 0, void 0, function* () {
            socket.on('message', (payload) => __awaiter(void 0, void 0, void 0, function* () {
                var ts_hms = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                console.log(ts_hms);
                yield mongo.db.collection('chat').insertOne({
                    userSender: payload.usersender,
                    userReceiver: payload.userreceiver,
                    msgDate: ts_hms,
                    message: payload.msg
                })
                    .then((result) => console.log(result))
                    .catch((error) => console.log(error));
            }));
        }),
        getChatMessages: (io, socket) => __awaiter(void 0, void 0, void 0, function* () {
            socket.on('getChatMessages', (payload) => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield mongo.db.collection('chat').find({ $or: [
                        { userSender: payload.usersender, userReceiver: payload.userreceiver },
                        { userSender: payload.userreceiver, userReceiver: payload.usersender }
                    ]
                })
                    .sort({ msgDate: 1 })
                    .toArray()
                    .then((result) => {
                    if (!result) {
                        return {
                            ok: false,
                            code: 404,
                        };
                    }
                    return {
                        ok: true,
                        code: 200,
                        result
                    };
                })
                    .catch((error) => {
                    return {
                        ok: false,
                        code: 500,
                        error
                    };
                });
                let chatMessages = [];
                chatMessages = response.result;
                console.log(chatMessages);
                io.emit('returnChat', chatMessages);
            }));
        }),
        logout: (socket) => __awaiter(void 0, void 0, void 0, function* () {
            socket.on('logout', () => __awaiter(void 0, void 0, void 0, function* () {
                yield mongo.db.collection('sockets')
                    .remove({ socketId: socket.id })
                    .then((result) => console.log(result))
                    .catch((error) => console.log(error));
            }));
        }),
        disconnect: (socket) => {
            socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
                console.log(`Desconexión del cliente con ID: ${socket.id}`);
                // Eliminar socket desconectado
                yield mongo.db.collection('sockets')
                    .remove({ socketId: socket.id })
                    .then((result) => console.log(result))
                    .catch((error) => console.log(error));
                //To Do Guardar Log en Base de datos
            }));
        }
    };
};
