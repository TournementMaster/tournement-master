// src/app/models/Club.ts

/**
 * API’den dönen kulüp objesinin tipi.
 */
export interface Club {
    id: number
    name: string
    city: string
    created_at: string   // ISO tarih
    owner: number        // oluşturan kullanıcı ID’si
}
