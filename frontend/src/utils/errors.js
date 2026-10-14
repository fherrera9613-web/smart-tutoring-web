import { ApiError } from '../services/api.js'

export function resolveErrorMessage(error, onUnauthorized) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      onUnauthorized?.()
      return 'La sesión expiró. Inicie sesión nuevamente.'
    }

    return error.message
  }

  return 'Ocurrió un error inesperado. Intente nuevamente.'
}
