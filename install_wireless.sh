#!/bin/bash
# ==============================================================================
# CAPIVARA-EMU: WIRELESS ADB INSTALLER (ZERO CABOS)
# ==============================================================================

APK_PATH="/home/kali/Desktop/Projetos/capivara-emu/android/app/build/outputs/apk/debug/app-debug.apk"
DEFAULT_IP="192.168.1.11"

echo "====================================================="
echo "🎮 CAPIVARA-EMU — INSTALADOR SEM FIO VIA WI-FI 🚀"
echo "====================================================="
echo ""

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK não encontrado em: $APK_PATH"
    echo "Execute primeiro o build do projeto."
    exit 1
fi

echo "Selecione o modo de conexão:"
echo "1) Android 11+ (Depuração por Wi-Fi nativa - Sem nunca precisar de cabo)"
echo "2) Conexão Direta TCP/IP (Porta 5555 - Caso já tenha ativado antes)"
echo ""
read -p "Escolha [1 ou 2] (padrão 1): " MODO
MODO=${MODO:-1}

read -p "IP do Celular (padrão: $DEFAULT_IP): " PHONE_IP
PHONE_IP=${PHONE_IP:-$DEFAULT_IP}

if [ "$MODO" == "1" ]; then
    echo ""
    echo "📱 No seu celular:"
    echo "  1. Vá em 'Configurações' > 'Opções do Desenvolvedor'"
    echo "  2. Ative 'Depuração por Wi-Fi' (ou 'Wireless Debugging')"
    echo "  3. Toque em 'Parear dispositivo com código de pareamento'"
    echo ""
    read -p "Porta de Pareamento mostrada no celular (ex: 38475): " PAIR_PORT
    read -p "Código de Pareamento de 6 dígitos (ex: 123456): " PAIR_CODE
    
    echo ""
    echo "🔗 Pareando com o celular..."
    adb pair "$PHONE_IP:$PAIR_PORT" "$PAIR_CODE"
    
    echo ""
    read -p "Agora informe a Porta Principal de conexão (mostrada na tela principal de Depuração por Wi-Fi): " CONNECT_PORT
    echo "📡 Conectando ao dispositivo..."
    adb connect "$PHONE_IP:$CONNECT_PORT"
else
    echo "📡 Conectando a $PHONE_IP:5555..."
    adb connect "$PHONE_IP:5555"
fi

echo ""
echo "📱 Verificando dispositivos conectados:"
adb devices

echo ""
echo "🚀 Instalando o APK atualizado no celular via Wi-Fi..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "====================================================="
    echo "🏆 GG! APK instalado com sucesso no celular sem cabos!"
    echo "====================================================="
else
    echo ""
    echo "⚠️ Falha ao instalar. Verifique se o celular aceitou a depuração na tela."
fi
