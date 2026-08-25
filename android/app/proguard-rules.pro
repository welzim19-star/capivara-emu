# Keep all JNI native methods and classes for CapivaraEngine
-keep class com.capivaraemu.studio.** { *; }
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Capacitor Plugin bindings
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
