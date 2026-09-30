/**
 * RF-11 — Localização compartilhada
 * Converte coordenadas GPS em bairro mais próximo usando distância euclidiana
 * (suficiente para a escala de Bauru; sem necessidade de API externa)
 */

import { bairros } from "./knowledge/bairros-bauru"

interface BairroComCoordenadas {
  nome: string
  regiao: string
  lat: number
  lng: number
}

// Coordenadas aproximadas dos centroides de cada bairro de Bauru
// Fonte: estimativas baseadas na geografia da cidade
const bairrosGeo: BairroComCoordenadas[] = [
  { nome: "Centro",                        regiao: "Central",      lat: -22.3154, lng: -49.0608 },
  { nome: "Vila Falcão",                   regiao: "Central",      lat: -22.3200, lng: -49.0650 },
  { nome: "Jardim Bela Vista",             regiao: "Central",      lat: -22.3180, lng: -49.0580 },
  { nome: "Vila Cardia",                   regiao: "Central",      lat: -22.3220, lng: -49.0620 },
  { nome: "Vila Aviação",                  regiao: "Central",      lat: -22.3100, lng: -49.0550 },
  { nome: "Jardim Panorama",               regiao: "Central",      lat: -22.3250, lng: -49.0590 },

  { nome: "Jardim Estoril",                regiao: "Norte",        lat: -22.2980, lng: -49.0620 },
  { nome: "Parque Jaraguá",                regiao: "Norte",        lat: -22.2900, lng: -49.0580 },
  { nome: "Vila São Paulo",                regiao: "Norte",        lat: -22.2950, lng: -49.0700 },
  { nome: "Jardim Redentor",               regiao: "Norte",        lat: -22.2870, lng: -49.0640 },
  { nome: "Jardim Progresso",              regiao: "Norte",        lat: -22.2920, lng: -49.0660 },
  { nome: "Vila Independência",            regiao: "Norte",        lat: -22.3010, lng: -49.0680 },
  { nome: "Parque Santa Edwiges",          regiao: "Norte",        lat: -22.2860, lng: -49.0600 },

  { nome: "Mary Dota",                     regiao: "Sul",          lat: -22.3450, lng: -49.0620 },
  { nome: "Jardim Godoy",                  regiao: "Sul",          lat: -22.3500, lng: -49.0580 },
  { nome: "Vila Guedes",                   regiao: "Sul",          lat: -22.3420, lng: -49.0650 },
  { nome: "Jardim Ferraz",                 regiao: "Sul",          lat: -22.3380, lng: -49.0600 },
  { nome: "Parque Paulistano",             regiao: "Sul",          lat: -22.3480, lng: -49.0700 },
  { nome: "Jardim Petrópolis",             regiao: "Sul",          lat: -22.3550, lng: -49.0640 },
  { nome: "Vila Lemos",                    regiao: "Sul",          lat: -22.3400, lng: -49.0580 },

  { nome: "Jardim Contorno",               regiao: "Leste",        lat: -22.3200, lng: -49.0400 },
  { nome: "Vila Dutra",                    regiao: "Leste",        lat: -22.3150, lng: -49.0350 },
  { nome: "Jardim Flórida",                regiao: "Leste",        lat: -22.3100, lng: -49.0420 },
  { nome: "Parque Viaduto",                regiao: "Leste",        lat: -22.3250, lng: -49.0380 },
  { nome: "Jardim Eldorado",               regiao: "Leste",        lat: -22.3180, lng: -49.0450 },
  { nome: "Vila Souto",                    regiao: "Leste",        lat: -22.3220, lng: -49.0480 },

  { nome: "Jardim Bongiovani",             regiao: "Oeste",        lat: -22.3150, lng: -49.0800 },
  { nome: "Parque das Nações",             regiao: "Oeste",        lat: -22.3200, lng: -49.0850 },
  { nome: "Jardim Solange",                regiao: "Oeste",        lat: -22.3100, lng: -49.0780 },
  { nome: "Vila Camargo",                  regiao: "Oeste",        lat: -22.3250, lng: -49.0820 },

  { nome: "Jardim Universitário",          regiao: "Universitária", lat: -22.3300, lng: -49.0750 },
  { nome: "Vila Nova Cidade Universitária",regiao: "Universitária", lat: -22.3350, lng: -49.0780 },
  { nome: "Vila Universitária",            regiao: "Universitária", lat: -22.3280, lng: -49.0720 },
]

function distancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat1 - lat2
  const dlng = lng1 - lng2
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

/**
 * Retorna o bairro mais próximo das coordenadas fornecidas.
 * Limite de 3 km (~0.027 graus) — fora disso retorna null (fora de Bauru).
 */
export function coordenadasParaBairro(
  lat: number,
  lng: number
): { bairro: string; regiao: string } | null {
  const LIMITE = 0.027 // ~3 km em graus

  let melhor: BairroComCoordenadas | null = null
  let menorDist = Infinity

  for (const b of bairrosGeo) {
    const d = distancia(lat, lng, b.lat, b.lng)
    if (d < menorDist) {
      menorDist = d
      melhor = b
    }
  }

  if (!melhor || menorDist > LIMITE) return null
  return { bairro: melhor.nome, regiao: melhor.regiao }
}

/**
 * Extrai coordenadas do texto especial gerado pelo server.ts
 * quando o cliente compartilha localização.
 * Formato: "__localizacao:lat,lng__"
 */
export function extrairCoordenadas(texto: string): { lat: number; lng: number } | null {
  const match = texto.match(/__localizacao:([-\d.]+),([-\d.]+)__/)
  if (!match) return null
  return { lat: Number(match[1]), lng: Number(match[2]) }
}
