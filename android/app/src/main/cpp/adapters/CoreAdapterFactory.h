#ifndef CORE_ADAPTER_FACTORY_H
#define CORE_ADAPTER_FACTORY_H

#include "ICoreAdapter.h"
#include "GenericAdapter.h"
#include "Mupen64Adapter.h"
#include "PlayAdapter.h"
#include <memory>
#include <string>

class CoreAdapterFactory {
public:
    static std::unique_ptr<ICoreAdapter> getAdapter(const std::string& corePath, const std::string& systemDir) {
        if (corePath.find("mupen64plus") != std::string::npos || 
            corePath.find("flycast") != std::string::npos || 
            corePath.find("ppsspp") != std::string::npos || 
            corePath.find("swanstation") != std::string::npos) {
            return std::make_unique<Mupen64Adapter>();
        } else if (corePath.find("play") != std::string::npos || corePath.find("nethersx2") != std::string::npos) {
            return std::make_unique<PlayAdapter>(systemDir);
        } else {
            return std::make_unique<GenericAdapter>();
        }
    }
};

#endif // CORE_ADAPTER_FACTORY_H
