import { Socket } from 'socket.io';

let usersList: any[] = [];

export default (mongo: any) => {
    return {
        listenSocketConnect: async (socket: Socket) => {
            await mongo.db.collection('sockets').insertOne({
                socketId: socket.id,
                usuario: null
            })
            .then((result: any) => console.log(result))
            .catch((error: any) => console.log(error));
        },
        signUp: (io: any, socket: Socket) => {
            socket.on('signUp', async (payload: any) => {

                await mongo.db.collection('sockets').findOneAndUpdate(
                    { socketId: socket.id },
                    { $set: { usuario: payload.email } }
                )
                .then((result: any) => console.log(result))
                .catch((error: any) => console.log(error));
        
                await mongo.db.collection('usuarios').findOneAndUpdate(
                        { correo: payload.email },
                        {
                            $set: {
                                nombreCompleto: payload.fullName,
                                fotoURL: payload.photoUrl
                            }
                        },
                        {
                            upsert: true
                        }
                    )
                    .then((result: any) => { console.log(result); })
                    .catch((error: any) => console.log(error));

                usersList.push(payload)

                io.emit('broadcast-message', usersList);
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