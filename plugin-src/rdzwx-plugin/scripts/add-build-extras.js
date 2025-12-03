const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
    const appPath = path.join(
        ctx.opts.projectRoot,
        'platforms', 'android', 'app'
    );

    if (!fs.existsSync(appPath)) {
        // platform not added yet
        return;
    }

    const extrasPath = path.join(appPath, 'build-extras.gradle');

    const content = `
android {
    buildFeatures {
        aidl = true
    }
}

configurations.all {
    exclude group: "org.jetbrains.kotlin", module: "kotlin-stdlib-jdk7"
    exclude group: "org.jetbrains.kotlin", module: "kotlin-stdlib-jdk8"
}
`.trim();

    fs.writeFileSync(extrasPath, content, 'utf8');
    console.log('[rdzwx-plugin] Created build-extras.gradle');
};

