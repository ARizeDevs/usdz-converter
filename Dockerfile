# # FROM node:14.17.0-stretch
# Since USD takes so long to build, we separate it into it's own container
FROM leon/usd:latest

WORKDIR /usr/src/ufg

# Add NASM
RUN apt-get install nasm

# Add PIL
RUN pip install Pillow

# Configuration
ARG UFG_RELEASE="f99580c4215ef7e6bac382d3f72b4ee13bef5a81"
ARG UFG_SRC="/usr/src/ufg"
ARG UFG_INSTALL="/usr/local/ufg"
ENV USD_DIR="/usr/local/usd"
ENV LD_LIBRARY_PATH="${USD_DIR}/lib:${UFG_SRC}/lib"
ENV PATH="${PATH}:${UFG_INSTALL}/bin"
ENV PYTHONPATH="${PYTHONPATH}:${UFG_INSTALL}/python"

# Build + install usd_from_gltf
RUN git init && \
    git remote add origin https://github.com/HadiGolkarian/usd_from_gltf && \
    git fetch --depth 1 origin "${UFG_RELEASE}" && \
    git checkout FETCH_HEAD && \
    python "${UFG_SRC}/tools/ufginstall/ufginstall.py" -v "${UFG_INSTALL}" "${USD_DIR}" && \
    cp -r "${UFG_SRC}/tools/ufgbatch" "${UFG_INSTALL}/python" && \
    rm -rf "${UFG_SRC}" "${UFG_INSTALL}/build" "${UFG_INSTALL}/src"

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash
RUN apt-get install -y nodejs
RUN node --version
# RUN apt-get install -y npm
RUN curl -L https://npmjs.org/install.sh | sh
RUN npm -v

RUN mkdir /usr/src/app

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9090

# RUN npm run build

CMD npm start
