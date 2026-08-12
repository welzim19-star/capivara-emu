#ifndef ICORE_ADAPTER_H
#define ICORE_ADAPTER_H

#include <string>
#include "../libretro.h"

// Interface base para os adaptadores de cada núcleo (Isolamento Galvânico)
class ICoreAdapter {
public:
    virtual ~ICoreAdapter() = default;

    // Retorna true se este núcleo for considerado clássico (2D) e aceitar Fast-Forward.
    virtual bool supportsFastForward() const = 0;

    // Aplica configurações no ambiente (Environment), como OpenGL / Core Options Version.
    virtual bool applyEnvironmentHacks(unsigned cmd, void* data, retro_environment_t original_cb) = 0;

    // Seta as portas de controle (Analógico vs D-Pad)
    virtual void setupControllerPorts(void (*set_controller_port_device)(unsigned, unsigned)) = 0;

    // Configura as opções do núcleo
    virtual void injectVariables() = 0;
};

#endif // ICORE_ADAPTER_H
