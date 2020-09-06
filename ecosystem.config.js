module.exports = {
  apps : [
    {
      name: 'dacha',
      script: 'dacha.js',
      max_memory_restart: '100M',
      watch: true,
      ignore_watch: ['node_modules', '/home/pi/dachabot/values.json']
    }
  ]
};
