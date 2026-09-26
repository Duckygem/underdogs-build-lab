plugins { id("com.android.application") }

android {
    namespace = "com.duckygem.rltracker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.duckygem.rltracker"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0-live"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
