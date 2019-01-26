module.exports = {
  'presets': [
    [
      '@babel/preset-env',
      {
        'targets': {
          'browsers': [
            'chrome 60'
          ]
        },
        'modules': false
      }
    ]
  ],
  'plugins': [
    [
      '@babel/plugin-proposal-decorators',
      {
        'legacy': false,
        'decoratorsBeforeExport': false
      }
    ]
  ],
  'env': {
    'test': {
      'presets': [
        [
          '@babel/preset-env',
          {
            'targets': {
              'browsers': [
                'chrome 60'
              ]
            }
          }
        ]
      ]
    }
  }
}
