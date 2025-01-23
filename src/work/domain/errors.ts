export class WorkdayOpenError extends Error {
  constructor() {
    super('WORKDAY_ALREADY_OPEN');
  }
}

export class PeriodClosedError extends Error {
  constructor() {
    super('La quincena esta cerrada');
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales invalidas');
  }
}

export class UserInactiveError extends Error {
  constructor() {
    super('Usuario inactivo');
  }
}