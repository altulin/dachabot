module.exports = {
  apps : [
    {
      name: 'dacha',
      script: 'dacha.js',
      out_file: "/dev/null",
      error_file: "/dev/null",
      max_memory_restart: '200M',
      watch: false,
      ignore_watch: ['node_modules', '/home/pi/dachabot/values.json']
    }
  ]
};
