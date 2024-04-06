const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const defaultOptions={toConsole: true, toFile: true, level: 'debug'};

function getLogger(name, options={toConsole: true, toFile: true, level: 'debug'}) {
    options = {...defaultOptions, ...options};
    const config = {
        level: options.level || 'debug',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
        transports: [
        ]
    }
    if (options.toFile) {
        config.transports.push(
            // new winston.transports.File({ filename: path.join(__dirname, '../../logs/', `${name}.log`) })
            new DailyRotateFile({
                filename: path.join(__dirname, '../logs/', `${name}-%DATE%.log`),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '10m',
                maxFiles: '1d',
                level: 'info',
            })
        )
    }
    if (options.toConsole) {
        config.transports.push(
            new winston.transports.Console(),
        )
    }
    return winston.createLogger(config);
}

module.exports = {
    getLogger,
}
