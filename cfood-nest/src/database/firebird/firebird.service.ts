import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Firebird from 'node-firebird'

@Injectable()
export class FirebirdService {
    constructor(private readonly config: ConfigService){}

    private getOprions(){
        const options = {
            host: this.config.getOrThrow<string>('FB_HOST'),
            port: Number(this.config.get('FB_PORT')),
            database: this.config.getOrThrow<string>('FB_DATABASE'),
            user: this.config.getOrThrow<string>('FB_USER'),
            password: this.config.getOrThrow<string>('FB_PASSWORD'),
            lowercase_keys: true
        }
        return options
    }
    
    private async connect(): Promise<Firebird.Database> {
        const options = this.getOprions()
       
        const db = await Firebird.attachAsync(options)

        return db
    }

    async query<T>(
        sql:string,
        params: unknown[] = [],
    ): Promise<T[]> {
        const db = await this.connect()
        try {
            const result = await db.queryAsync<T>(sql, params)
            return result
        } finally {
            db.detachAsync()
        }
    }

    async exectue(sql: string, params: unknown[] = []): Promise<void> {
        const db = await Firebird.attachAsync(this.getOprions())

        try {
            await db.withTransaction(async (transaction) => {
                await transaction.executeAsync(sql, params)
            })
        } finally {
            await db.detachAsync()
        }
    }
}
