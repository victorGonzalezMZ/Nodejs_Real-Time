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
Object.defineProperty(exports, "__esModule", { value: true });
let usersList = [];
exports.default = (mongo) => {
    return {
        listenSocketConnect: (socket) => __awaiter(void 0, void 0, void 0, function* () {
            yield mongo.db.collection('sockets').insertOne({
                socketId: socket.id,
                usuario: null
            })
                .then((result) => console.log(result))
                .catch((error) => console.log(error));
        }),
        signUp: (io, socket) => {
            socket.on('signUp', (payload) => __awaiter(void 0, void 0, void 0, function* () {
                yield mongo.db.collection('sockets').findOneAndUpdate({ socketId: socket.id }, { $set: { usuario: payload.email } })
                    .then((result) => console.log(result))
                    .catch((error) => console.log(error));
                yield mongo.db.collection('usuarios').findOneAndUpdate({ correo: payload.email }, {
                    $set: {
                        nombreCompleto: payload.fullName,
                        fotoURL: payload.photoUrl
                    }
                }, {
                    upsert: true
                })
                    .then((result) => { console.log(result); })
                    .catch((error) => console.log(error));
                usersList.push(payload);
                io.emit('broadcast-message', usersList);
            }));
        },
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
