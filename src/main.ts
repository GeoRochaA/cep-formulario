import './style.css'

type StatusType = 'idle' | 'loading' | 'success' | 'error'

type CepAddress = {
  cep: string
  street: string
  neighborhood: string
  city: string
  state: string
}

const REQUEST_TIMEOUT_MS = 8000
const ESTADOS = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
])

const form = getElement<HTMLFormElement>('#address-form')
const cep = getElement<HTMLInputElement>('#cep')
const logradouro = getElement<HTMLInputElement>('#logradouro')
const numero = getElement<HTMLInputElement>('#numero')
const bairro = getElement<HTMLInputElement>('#bairro')
const cidade = getElement<HTMLInputElement>('#cidade')
const estado = getElement<HTMLSelectElement>('#estado')
const buscar = getElement<HTMLButtonElement>('#buscar')
const limpar = getElement<HTMLButtonElement>('#limpar')
const statusMessage = getElement<HTMLDivElement>('#status-message')

let activeController: AbortController | null = null
let requestId = 0

form.addEventListener('submit', (event) => {
  event.preventDefault()
  void consultarCep()
})

cep.addEventListener('input', () => {
  if (activeController) {
    activeController.abort()
    activeController = null
    requestId += 1
    setLoading(false)
  }

  cep.value = formatarCep(cep.value)
  cep.setCustomValidity('')
  cep.setAttribute('aria-invalid', 'false')

  if (somenteNumeros(cep.value).length < 8) {
    limparEndereco()
    setStatus('', 'idle')
  }
})

cep.addEventListener('blur', () => {
  if (somenteNumeros(cep.value).length === 8) {
    void consultarCep()
  }
})

limpar.addEventListener('click', () => {
  activeController?.abort()
  activeController = null
  requestId += 1
  form.reset()
  limparEndereco()
  setLoading(false)
  setStatus('', 'idle')
  cep.setCustomValidity('')
  cep.setAttribute('aria-invalid', 'false')
  cep.focus()
})

async function consultarCep() {
  const cepNumerico = somenteNumeros(cep.value)

  if (!cepValido(cepNumerico)) {
    limparEndereco()
    cep.setCustomValidity('Informe um CEP válido com 8 números.')
    cep.setAttribute('aria-invalid', 'true')
    setStatus('Informe um CEP válido com 8 números.', 'error')
    cep.reportValidity()
    cep.focus()
    return
  }

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  requestId += 1
  const currentRequest = requestId
  let timedOut = false
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  setLoading(true)
  setStatus('Consultando CEP...', 'loading')
  cep.setAttribute('aria-invalid', 'false')

  try {
    const endereco = await buscarEndereco(cepNumerico, controller.signal)

    if (currentRequest !== requestId) return

    preencherEndereco(endereco)
    cep.value = formatarCep(endereco.cep || cepNumerico)
    cep.setCustomValidity('')
    setStatus('Endereço encontrado. Confira o número antes de continuar.', 'success')
    numero.focus()
  } catch (error) {
    if (currentRequest !== requestId) return

    limparEndereco()
    cep.setAttribute('aria-invalid', 'true')

    if (isAbortError(error) && timedOut) {
      setStatus('A consulta demorou demais. Tente novamente.', 'error')
    } else if (!isAbortError(error)) {
      setStatus('CEP não encontrado ou indisponível no momento.', 'error')
    }
  } finally {
    window.clearTimeout(timeoutId)

    if (currentRequest === requestId) {
      setLoading(false)
      activeController = null
    }
  }
}

async function buscarEndereco(cepNumerico: string, signal: AbortSignal): Promise<CepAddress> {
  const consultas = [consultarBrasilApi, consultarViaCep]
  let ultimoErro: unknown = null

  for (const consulta of consultas) {
    try {
      const endereco = await consulta(cepNumerico, signal)

      if (endereco) {
        return endereco
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }

      ultimoErro = error
    }
  }

  if (ultimoErro instanceof Error) {
    throw ultimoErro
  }

  throw new Error('CEP não encontrado.')
}

async function consultarBrasilApi(
  cepNumerico: string,
  signal: AbortSignal,
): Promise<CepAddress | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${encodeURIComponent(cepNumerico)}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (response.status === 404) return null
  if (!response.ok) throw new Error('BrasilAPI indisponível.')

  const payload: unknown = await response.json()

  if (!isRecord(payload)) {
    throw new Error('Resposta inválida.')
  }

  return normalizarEndereco({
    cep: getString(payload.cep) || cepNumerico,
    street: getString(payload.street),
    neighborhood: getString(payload.neighborhood),
    city: getString(payload.city),
    state: getString(payload.state),
  })
}

async function consultarViaCep(
  cepNumerico: string,
  signal: AbortSignal,
): Promise<CepAddress | null> {
  const response = await fetch(`https://viacep.com.br/ws/${encodeURIComponent(cepNumerico)}/json/`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) throw new Error('ViaCEP indisponível.')

  const payload: unknown = await response.json()

  if (!isRecord(payload)) {
    throw new Error('Resposta inválida.')
  }

  if (payload.erro === true) {
    return null
  }

  return normalizarEndereco({
    cep: getString(payload.cep) || cepNumerico,
    street: getString(payload.logradouro),
    neighborhood: getString(payload.bairro),
    city: getString(payload.localidade),
    state: getString(payload.uf),
  })
}

function normalizarEndereco(endereco: CepAddress): CepAddress {
  const estadoNormalizado = endereco.state.trim().toUpperCase()

  if (!endereco.city.trim() || !ESTADOS.has(estadoNormalizado)) {
    throw new Error('Resposta de CEP incompleta.')
  }

  return {
    cep: somenteNumeros(endereco.cep) || endereco.cep,
    street: endereco.street.trim(),
    neighborhood: endereco.neighborhood.trim(),
    city: endereco.city.trim(),
    state: estadoNormalizado,
  }
}

function preencherEndereco(endereco: CepAddress) {
  logradouro.value = endereco.street
  bairro.value = endereco.neighborhood
  cidade.value = endereco.city
  estado.value = endereco.state
}

function limparEndereco() {
  logradouro.value = ''
  numero.value = ''
  bairro.value = ''
  cidade.value = ''
  estado.value = ''
}

function setLoading(isLoading: boolean) {
  form.classList.toggle('is-loading', isLoading)
  buscar.disabled = isLoading
  buscar.textContent = isLoading ? 'Consultando...' : 'Consultar'
}

function setStatus(message: string, type: StatusType) {
  statusMessage.textContent = message
  statusMessage.dataset.status = type
}

function cepValido(value: string) {
  return /^\d{8}$/.test(value) && !/^(\d)\1{7}$/.test(value)
}

function formatarCep(value: string) {
  const digits = somenteNumeros(value).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

function somenteNumeros(value: string) {
  return value.replace(/\D/g, '')
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function getElement<T extends HTMLElement>(selector: string) {
  const element = document.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Elemento não encontrado: ${selector}`)
  }

  return element
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
