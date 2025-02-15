import React from 'react'

import Grid from '@material-ui/core/Grid'
import Chip from '@material-ui/core/Chip'

import useStyles from './styles'

export type MasterChipsProps = {
  chips: {
    label: string
    onDelete?: (id?: any) => void
  }[]
}
const MasterChips: React.FC<MasterChipsProps> = ({ chips }) => {
  const classes = useStyles()

  return (
    <Grid>
      {chips?.length > 0 &&
        chips.map(({ label, onDelete }, index) => (
          <Chip
            key={index}
            className={classes.chips}
            label={label}
            onDelete={onDelete}
            color="primary"
            variant="outlined"
          />
        ))}
    </Grid>
  )
}

export default MasterChips
