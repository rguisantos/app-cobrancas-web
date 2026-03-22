// lib/hash.ts — Hash de senhas com bcrypt
import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, ROUNDS)
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}
