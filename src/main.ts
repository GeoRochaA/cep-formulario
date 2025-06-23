import './style.css'

const cep = document.querySelector<HTMLInputElement>('#cep')!
const logradouro = document.querySelector<HTMLInputElement>('#logradouro')!
const numero = document.querySelector<HTMLInputElement>('#numero')!
const bairro = document.querySelector<HTMLInputElement>('#bairro')!
const cidade = document.querySelector<HTMLSelectElement>('#cidade')!
const estado = document.querySelector<HTMLSelectElement>('#estado')!

const cidadesPorRegiao: Record<string, string[]> = {
  'Norte': [
    'Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal',
    'Guajará-Mirim', 'Rolim de Moura', 'Jaru', 'Pimenta Bueno',
    'Machadinho d\'Oeste', 'Ouro Preto do Oeste', 'Buritis', 'Espigão d\'Oeste',
    'Manaus', 'Belém', 'Rio Branco', 'Boa Vista', 'Macapá', 'Palmas'
  ],
  'Nordeste': ['Salvador', 'Fortaleza', 'Recife', 'Natal', 'Maceió', 'São Luís', 'João Pessoa', 'Aracaju', 'Teresina'],
  'Centro-Oeste': ['Brasília', 'Goiânia', 'Cuiabá', 'Campo Grande'],
  'Sudeste': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Vitória'],
  'Sul': ['Curitiba', 'Porto Alegre', 'Florianópolis']
}

const estadosPorRegiao: Record<string, string[]> = {
  'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC']
}

cep.addEventListener('blur', () => {
  consultarCep()
})

estado.addEventListener('change', () => {
  atualizarCidades(estado.value)
})

function limparFormulario() {
  logradouro.value = ""
  numero.value = ""
  bairro.value = ""
  cidade.innerHTML = `<option value="">Selecione a cidade</option>`
  estado.value = ""
}

limparFormulario()

async function consultarCep() {
  try {
    const result = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep.value}`)
    if (!result.ok) throw new Error('CEP não encontrado')

    const body = await result.json()
    logradouro.value = body.street || ""
    bairro.value = body.neighborhood || ""
    estado.value = body.state || ""
    atualizarCidades(body.state, body.city || "")
    numero.focus()
  } catch (e) {
    alert("CEP não encontrado ou inválido.")
    limparFormulario()
    cep.focus()
  }
}

function atualizarCidades(siglaEstado: string, cidadeSelecionada: string = "") {
  cidade.innerHTML = `<option value="">Selecione a cidade</option>`
  let encontrou = false

  for (const [regiao, estados] of Object.entries(estadosPorRegiao)) {
    if (estados.includes(siglaEstado)) {
      const cidades = cidadesPorRegiao[regiao]

      if (cidadeSelecionada && !cidades.includes(cidadeSelecionada)) {
        const option = document.createElement('option')
        option.value = cidadeSelecionada
        option.textContent = cidadeSelecionada
        option.selected = true
        cidade.appendChild(option)
        encontrou = true
      }

      cidades.forEach(c => {
        const option = document.createElement('option')
        option.value = c
        option.textContent = c
        if (c === cidadeSelecionada) option.selected = true
        cidade.appendChild(option)
      })

      break
    }
  }

  if (!encontrou && cidadeSelecionada === "") {
    cidade.selectedIndex = 0
  }
}
