import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const repoUrl = 'https://github.com/jacksonmongbam123/1013AEORL22.git';
const tempDir = '/tmp/cloned_repo';

try {
  // Clean up any existing temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(`Cloning ${repoUrl} into ${tempDir}...`);
  execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: 'inherit' });

  console.log('Cloning successful! Listing files in cloned repo:');
  const files = fs.readdirSync(tempDir);
  console.log(files);

  // Check if src directory exists
  if (fs.existsSync(path.join(tempDir, 'src'))) {
    console.log('src contents:', fs.readdirSync(path.join(tempDir, 'src')));
  }

} catch (err) {
  console.error('Error cloning/inspecting repo:', err);
}
