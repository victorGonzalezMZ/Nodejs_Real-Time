//import JSON Web Token
import jwt from 'jsonwebtoken';
import MongoClient from 'mongodb';

export default (ENV: any, mongo: any) => {

    const _getSecretKey = async (apiKey: string) => {
        return await mongo.db.collection('app')
        .findOne(
            { _id: new MongoClient.ObjectID(apiKey) }, 
            { projection: { _id: 0, secretKey: 1 } })
        .then((result: string) => {
            if (!result) {
                return null;
            }
            return result;
        })
        .catch((error: any) => {
            console.log(error);
            return null;
        });
    }

    return {
        create: async (payload: any, apiKey: string) => {
            
            // Utilizar la API KEY para consultar la tabla APP y obtener el Secret Key
            const response: any = await _getSecretKey(apiKey);

            console.log('===============>', response.secretKey);
            
            return new Promise((resolve: any, reject: any) => {

                jwt.sign(payload, response.secretKey, { expiresIn: ENV.TOKEN.EXPIRES }, (error: any, token: any) => {
                    if (error){
                        return reject({ok: false, error});
                    }
                    return resolve({ok: true, token});
                });

            });

        },
        verify: async (bearerToken: string, apiKey: string) => {

            const response: any = await _getSecretKey(apiKey);

            return jwt.verify(bearerToken, response.secretKey, (error: any, tokenDecoded: any) => {
                if (error) {
                    return { ok: false, error };
                }
                return { ok: true, tokenDecoded };
            });

        },
        refresh: () => {
            //TO DO
        }
    }
}