# Consulta CEP

Projeto simples feito com Vite e TypeScript para consultar um CEP e preencher automaticamente os dados de endereço.

## Sobre o projeto

A aplicação permite informar um CEP brasileiro e buscar os dados de endereço em APIs públicas. O formulário preenche logradouro, bairro, cidade e estado quando o CEP é encontrado.

Recursos principais:

- Máscara automática para CEP no formato `00000-000`.
- Validação básica do CEP antes da consulta.
- Consulta pela BrasilAPI com fallback para ViaCEP.
- Mensagens de carregamento, sucesso e erro.
- Layout responsivo para desktop e celular.

## Tecnologias usadas

- HTML
- CSS
- TypeScript
- Vite

## Como rodar o projeto

### 1. Instale as dependências

No terminal, dentro da pasta do projeto, rode:

```bash
npm install
```

### 2. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Depois abra no navegador o endereço mostrado no terminal. Normalmente será:

```bash
http://localhost:5173/
```

### 3. Gerar versão de produção

Para compilar o projeto:

```bash
npm run build
```

Os arquivos finais serão gerados na pasta `dist`.

### 4. Visualizar a versão de produção

Depois do build, rode:

```bash
npm run preview
```

Abra o endereço mostrado no terminal para visualizar a versão compilada.

## Estrutura principal

```text
cep-formulario/
├── index.html
├── src/
│   ├── main.ts
│   └── style.css
├── package.json
└── README.md
```

## Observação

Para a consulta funcionar, o navegador precisa ter acesso à internet, pois os dados são buscados em APIs externas.
