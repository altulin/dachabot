module.exports = {
  apps : [
    {
      name: 'dacha',
      script: 'dacha.js',
      disable_logs: true,
      watch: ['dachabot'],
      ignore_watch: ['node_modules', 'values.json']
    }
  ],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
