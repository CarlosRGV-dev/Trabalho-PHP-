# Documentação do Projeto: Projeto em Foco

## 1. Visão Geral
O **Projeto em Foco** é um sistema web voltado para o controle e gestão de materiais, itens de inventário, atiradores e emissão/devolução de cautelas. 

Originalmente idealizado e prototypado em arquitetura moderna (React, TypeScript e Supabase via Lovable), o projeto foi totalmente adaptado e reestruturado para a stack web clássica: **HTML5, CSS3, JavaScript Vanilla (ES6+) e PHP 8+ com MySQL (PDO)**. Essa estrutura permite a execução local via **XAMPP** sem a necessidade de bundlers ou dependências de terceiros.

---

## 2. Tecnologias Utilizadas

- **Frontend:**
  - **HTML5:** Estruturação semântica das páginas e formulários.
  - **CSS3:** Estilização responsiva e moderna do painel e tabela.
  - **JavaScript (Vanilla):** Manipulação dinâmica do DOM, tratamento de formulários e requisições assíncronas via `fetch()`.

- **Backend:**
  - **PHP 8+:** Processamento de requisições e construção de APIs/endpoints JSON.
  - **PDO (PHP Data Objects):** Camada de conexão segura com o banco de dados e prevenção contra *SQL Injection*.

- **Banco de Dados:**
  - **MySQL (via phpMyAdmin):** Armazenamento relacional dos dados.

- **Servidor Local:**
  - **XAMPP:** Módulo Apache para o servidor PHP e MySQL para a base de dados.

---

## 3. Estrutura de Arquivos

```text
projeto-em-foco/
│
├── index.html          # Interface principal do painel (Listagem e Cadastro)
├── styles.css          # Estilos globais e layout da aplicação
├── script.js           # Lógica frontend (Fetch API e eventos do DOM)
│
├── conexao.php         # Script de conexão PDO com o MySQL
├── banco.sql           # Script DDL para criação do banco de dados e tabelas
│
└── api/
    └── itens.php       # Endpoint PHP (GET para listagem, POST para cadastro)
```

---

## 4. Modelo de Banco de Dados (`banco.sql`)

O banco de dados do projeto (`projeto_em_foco`) é composto pelas seguintes tabelas relacionais:

- **`atiradores`**: Registra os dados dos atiradores (nome, inscrição, turma).
- **`prateleiras`**: Registra as localizações/estantes físicas dos materiais.
- **`itens`**: Guarda as informações das ferramentas e materiais, vinculados opcionalmente a uma prateleira.
- **`cautelas`**: Gerencia o empréstimo de itens aos atiradores, acompanhando datas de retirada e devolução.

---

## 5. Arquitetura da Solução

1. **Camada de Apresentação (Navegador):** O usuário acessa a interface em `index.html`. Ao enviar formulários ou carregar a página, o `script.js` faz requisições HTTP assíncronas via `fetch()`.
2. **Camada de Aplicação (PHP/API):** O script em `api/itens.php` intercepta o método da requisição:
   - `GET`: Seleciona os registros no MySQL e os retorna em formato `JSON`.
   - `POST`: Recebe os dados em formato `JSON`, realiza a validação básica e insere um novo registro.
3. **Camada de Dados (MySQL):** Interage com o PHP utilizando `PDO` com tratamento de exceções.

---

## 6. Guia de Instalação e Execução Local (XAMPP)

1. **Configuração da Pasta:**
   - Coloque a pasta do projeto em `C:\xampp\htdocs\projeto-em-foco`.

2. **Inicialização do Servidor:**
   - Abra o **XAMPP Control Panel**.
   - Inicie os serviços **Apache** e **MySQL**.

3. **Criação da Base de Dados:**
   - Acesse `http://localhost/phpmyadmin` no navegador.
   - Crie o banco de dados `projeto_em_foco` com o collation `utf8mb4_unicode_ci`.
   - Na aba **Importar** (ou **SQL**), execute o script contido em `banco.sql`.

4. **Acesso à Aplicação:**
   - No navegador, navegue até: `http://localhost/projeto-em-foco/`