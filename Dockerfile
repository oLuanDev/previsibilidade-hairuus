# Use a imagem oficial do Playwright que já vem com Node.js e todas as dependências do Linux
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Cria o diretório de trabalho
WORKDIR /app

# Copia arquivos de dependência
COPY package*.json ./

# Instala o express e cors
RUN npm install

# Copia o restante dos arquivos do dashboard
COPY . .

# Expõe a porta que o server.js está rodando (5050)
EXPOSE 5050

# Comando para rodar o servidor
CMD ["node", "server.js"]
