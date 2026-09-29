# Especificação - Document Management System

**Status:** especificação do MVP. Os contratos abaixo descrevem o comportamento-alvo; upload, listagem e download ainda não estão implementados.

## 1. Objetivo

Entregar um sistema web local para enviar, listar e baixar documentos, armazenando os arquivos no filesystem da aplicação e seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos registrados durante a execução atual do backend.
- Download de um documento pelo identificador.
- Uso local, sem autenticação no MVP; o campo `owner` recebe o valor fixo `local`.
- Interface web React para as operações de upload, listagem e download, planejada para uma etapa futura.

### Fora do escopo

- Armazenamento externo, nuvem, banco de dados ou persistência durável dos metadados.
- Autenticação, contas, autorização ou isolamento de documentos por usuário.
- Versionamento, edição, exclusão, busca, paginação e compartilhamento de documentos.
- Validação por allowlist de extensão ou tipo MIME.
- Recuperação automática de metadados após reinício ou reconciliação de arquivos órfãos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar um arquivo por requisição `POST /upload`, no campo multipart `file`. Uma requisição sem arquivo ou com mais de um arquivo deve ser rejeitada. |
| RF-02 | O sistema deve gravar o arquivo no diretório local `backend/storage`, usando Multer com `diskStorage` e um nome físico gerado pelo sistema, independente do nome original. Nomes originais repetidos são permitidos. |
| RF-03 | Após um upload bem-sucedido, o sistema deve gerar um identificador único e registrar em memória `id`, `originalName`, `size`, `uploadedAt` e `owner`. |
| RF-04 | O sistema deve rejeitar arquivos maiores que `UPLOAD_MAX_FILE_SIZE_BYTES`, retornando erro de tamanho excedido sem deixar arquivo parcial no storage. O padrão do MVP é 10 MiB (10.485.760 bytes); a configuração deve ser feita por variável de ambiente. |
| RF-05 | O sistema deve listar os metadados de todos os documentos registrados na execução atual, do mais recente para o mais antigo. Quando não houver documentos, deve retornar uma lista vazia. |
| RF-06 | O sistema deve permitir baixar o conteúdo binário de um documento pelo `id`, como anexo com o nome original seguro. |
| RF-07 | Para um `id` sem documento registrado, o sistema deve responder `404` com o formato de erro definido nesta especificação. |
| RF-08 | Falhas de leitura ou gravação no filesystem devem resultar em erro controlado, sem expor caminhos locais ou detalhes internos ao cliente. |
| RF-09 | O sistema deve manter `GET /health` como endpoint operacional, respondendo `200` com `{ "status": "ok" }`. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser armazenados exclusivamente no filesystem local em `backend/storage`, por meio de Multer `diskStorage`. Não utilizar serviços externos ou cloud. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase. Reiniciar o processo limpa o registro; arquivos que permanecerem no disco tornam-se órfãos e não podem ser listados ou baixados pela API. |
| RNF-03 | O backend deve usar Node.js, Express e CommonJS; o frontend deve usar React, Vite e ES modules. JavaScript puro, sem TypeScript nesta fase. |
| RNF-04 | A configuração deve usar variáveis de ambiente. `PORT` define a porta HTTP e `UPLOAD_MAX_FILE_SIZE_BYTES` define o limite máximo do arquivo, com padrão de 10 MiB. O diretório de storage permanece fixo em `backend/storage`. |
| RNF-05 | O backend deve separar responsabilidades nas camadas `routes -> controllers -> services -> repositories`. As camadas internas não devem depender de Express. |
| RNF-06 | O frontend deve acessar a API usando `fetch` pelo prefixo `/api`. Em desenvolvimento, o proxy do Vite encaminha esse prefixo ao backend e o remove; as rotas do backend não incluem `/api`. |
| RNF-07 | Testes do backend devem usar o runner nativo `node:test` e cobrir contratos, validações e falhas de filesystem. |
| RNF-08 | O nome enviado pelo cliente não pode determinar o caminho físico de gravação. Caminhos locais e stack traces não devem ser incluídos nas respostas da API. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID gerado pelo servidor e identificador público do documento. |
| `originalName` | string | Nome do arquivo informado pelo cliente, preservado como metadado. |
| `size` | number | Tamanho do arquivo em bytes, como inteiro não negativo. |
| `uploadedAt` | string | Data/hora de recebimento bem-sucedido em ISO 8601 UTC. |
| `owner` | string | Valor fixo `local` no MVP. Não representa autenticação ou controle de acesso. |

O nome físico no storage deve ser gerado pelo servidor a partir do identificador (por exemplo, UUID sem extensão). Ele é detalhe interno de persistência e não deve aparecer no modelo de resposta nem revelar um caminho do filesystem. O nome original deve ser tratado com segurança antes de compor o cabeçalho de download.

## 6. Contratos de API

As rotas abaixo são contratos-alvo e ainda não estão implementadas. Os caminhos são relativos à origem do backend. O prefixo `/api` é usado pelo frontend através do proxy de desenvolvimento do Vite, não faz parte do caminho registrado no Express.

### Formato de erro

Erros da API devem usar `application/json` com o seguinte formato:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para tratamento pelo cliente; `message` é uma mensagem segura e legível. Erros internos não devem incluir stack trace, caminho local ou detalhes sensíveis.

### POST /upload

- **Entrada:** `multipart/form-data`, com exatamente um arquivo no campo `file`.
- **Limite:** `UPLOAD_MAX_FILE_SIZE_BYTES`, padrão de 10.485.760 bytes. Não há allowlist de MIME ou extensão no MVP.
- **Sucesso:** `201 Created`, `application/json`.

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-09-29T14:30:00.000Z",
    "owner": "local"
  }
}
```

- **Erros:** `400 Bad Request` (`FILE_REQUIRED`, `INVALID_MULTIPART`); `413 Content Too Large` (`FILE_TOO_LARGE`); `500 Internal Server Error` (`STORAGE_ERROR`). Se a gravação falhar, qualquer arquivo parcial deve ser removido quando possível e nenhum metadado deve ser registrado.

### GET /documents

- **Entrada:** sem corpo. Não há filtros nem paginação no MVP.
- **Sucesso:** `200 OK`, `application/json`. A propriedade `documents` contém os metadados em ordem decrescente de `uploadedAt`; uma coleção vazia retorna uma lista vazia.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-09-29T14:30:00.000Z",
      "owner": "local"
    }
  ]
}
```

- **Erros:** `500 Internal Server Error` (`DOCUMENT_LIST_ERROR`) se não for possível consultar o repositório de metadados.

### GET /documents/:id/download

- **Entrada:** `id` UUID do documento.
- **Sucesso:** `200 OK`, conteúdo binário com `Content-Type: application/octet-stream`, `Content-Disposition: attachment` contendo o nome original tratado com segurança e `X-Content-Type-Options: nosniff`.
- **Erros:** `404 Not Found` (`DOCUMENT_NOT_FOUND`) se o identificador não estiver registrado; `500 Internal Server Error` (`FILE_READ_ERROR`) se o arquivo registrado não puder ser lido. O caminho local não deve ser exposto.

## 7. Decisões arquiteturais

- **Backend:** rotas registram endpoints e middlewares; controllers traduzem HTTP para chamadas de serviço e formatam respostas; services aplicam regras de negócio; repositories gerenciam metadados em memória e acesso ao arquivo local. Dependências seguem `routes -> controllers -> services -> repositories`.
- **Upload:** Multer com `diskStorage` grava em `backend/storage`. O nome físico é gerado pelo servidor; o nome original é apenas metadado. O limite de tamanho é configurável por `UPLOAD_MAX_FILE_SIZE_BYTES`.
- **Metadados:** mantidos em uma estrutura em memória nesta fase. Não há banco de dados nem reconstrução após reinício; arquivos órfãos não são removidos automaticamente.
- **Frontend:** componentes funcionais React organizados em `components/`, `pages/` e `services/`; chamadas à API via `fetch` em `/api`. O proxy de desenvolvimento do Vite encaminha para as rotas do backend sem o prefixo.
- **Configuração:** `PORT` controla a porta HTTP; `UPLOAD_MAX_FILE_SIZE_BYTES` controla o limite do upload. O diretório de armazenamento é o caminho local fixo `backend/storage`.
- **Estado atual:** `GET /health` existe; os endpoints de documentos e as funcionalidades do frontend descritos nesta especificação são requisitos futuros.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. A entrega desta especificação não executa nem altera arquivos de backend, frontend, testes ou CI.

1. **Backend e testes:** implementar rotas, validações HTTP, middleware Multer, serviços e repositórios; cobrir upload, listagem, download, limites e falhas de filesystem com `node:test`.
2. **Frontend e integração:** implementar interface de upload/listagem/download em React, chamadas `fetch` pelo proxy `/api`, estados de carregamento e apresentação de erros.
3. **Verificação integrada e operação:** executar os testes e verificações do projeto, validar a integração frontend/backend e documentar configuração local e limitações de persistência.

**Critério de conclusão desta etapa de planejamento:** manter este documento em `docs/specs/dms-spec.md`; não iniciar as etapas de implementação listadas acima.