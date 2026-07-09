import type { FieldError, MultipleFieldErrors } from 'react-hook-form'

export function getFieldErrorMessages(error?: FieldError) {
  if (!error) {
    return []
  }

  const messages = error.types
    ? flattenErrorMessages(error.types)
    : error.message
      ? [error.message]
      : []

  return [...new Set(messages)]
}

function flattenErrorMessages(errors: MultipleFieldErrors) {
  return Object.values(errors).flatMap((message) => {
    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string')
    }

    return typeof message === 'string' ? [message] : []
  })
}
