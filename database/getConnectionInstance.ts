import { CFNOutputs } from 'src/aws/enums';
import * as pg from 'pg';

const { Sequelize } = require('sequelize');
const aws = require('aws-sdk');

const getDatabaseCredentials = async () => {
    console.log('INSIDE GET CREDENTIALS');
    try {
        const secretsManager = new aws.SecretsManager();
        const cloudFormation = new aws.CloudFormation();

        const stackName = process.env.STACK_NAME;

        console.log('STACKNAME');
        console.log(stackName);
        const data = await cloudFormation
            .describeStacks({ StackName: stackName })
            .promise();

        console.log('DATA');
        //@ts-ignore
        const outputs = data.Stacks[0].Outputs;
        //@ts-ignore
        const secretArn = outputs?.find(
            (o: any) =>
                o?.OutputKey === CFNOutputs.GET_DB_CREDENTIALS_SECRET_ARN
        ).OutputValue;

        console.log('GOT SECRET ARN:');
        console.log(secretArn);

        const response = await secretsManager
            .getSecretValue({ SecretId: secretArn }) // accepts Id or full ARN
            .promise();

        const secretString = response.SecretString;
        const credentials = JSON.parse(secretString as string);
        console.log('FINISH GET CREDENTIALS CORRECTLY');
        return credentials;
    } catch (err: any) {
        throw new Error(err);
    }
};

// export const getSequelize = async () => {
//     try {
//         if (!sequelize) {
//             const credentials = await getDatabaseCredentials();

//             sequelize = new Sequelize(
//                 credentials.dbname,
//                 credentials.username,
//                 credentials.password,
//                 {
//                     host: credentials.host,
//                     dialect: 'postgres',
//                     dialectModule: pg,
//                     port: credentials.port,
//                 }
//             );

//             console.log('BEFORE AUTHENTICATE');
//             await sequelize.authenticate();
//             console.log('AFTER AUTHENTICATE');
//             console.log('Connection to the RDS instance successful.');
//         }
//         return sequelize;
//     } catch (err: any) {
//         throw new Error(err);
//     }
// };

export const loadSequelize = async () => {
    console.log('INSIDE LOAD SEQUELIZE');
    const credentials = await getDatabaseCredentials();
    console.log('GOT CREDENTIALS SUCCESSFULLY INSIDE LOAD SEQUELIZE');
    console.log(credentials);
    const sequelize = new Sequelize(
        credentials.dbname,
        credentials.username,
        credentials.password,
        {
            host: credentials.host,
            dialect: 'postgres',
            dialectModule: pg,
            port: credentials.port,
            pool: {
                /*
                 * Lambda functions process one request at a time but your code may issue multiple queries
                 * concurrently. Be wary that `sequelize` has methods that issue 2 queries concurrently
                 * (e.g. `Model.findAndCountAll()`). Using a value higher than 1 allows concurrent queries to
                 * be executed in parallel rather than serialized. Careful with executing too many queries in
                 * parallel per Lambda function execution since that can bring down your database with an
                 * excessive number of connections.
                 *
                 * Ideally you want to choose a `max` number where this holds true:
                 * max * EXPECTED_MAX_CONCURRENT_LAMBDA_INVOCATIONS < MAX_ALLOWED_DATABASE_CONNECTIONS * 0.8
                 */
                max: 1,
                /*
                 * Set this value to 0 so connection pool eviction logic eventually cleans up all connections
                 * in the event of a Lambda function timeout.
                 */
                min: 0,
                /*
                 * Set this value to 0 so connections are eligible for cleanup immediately after they're
                 * returned to the pool.
                 */
                idle: 0,
                // Choose a small enough value that fails fast if a connection takes too long to be established.
                acquire: 5000,
                /*
                 * Ensures the connection pool attempts to be cleaned up automatically on the next Lambda
                 * function invocation, if the previous invocation timed out.
                 */
                evict: 60000,
            },
        }
    );

    // or `sequelize.sync()`
    await sequelize.authenticate();

    return sequelize;
};
