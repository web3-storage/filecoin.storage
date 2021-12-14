// ===================================================================== Imports
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import clsx from 'clsx'
// ====================================================================== Params
/**
 * @param {Array} props.collection
 * @param Boolean props.arrowSelectors
 * @param Boolean props.rangeInput
 * @param Number props.rows
 * @param {Object} props.displayOptions
 */
// =================================================================== Functions
function Content () {
  return null
}

function Previous () {
  return null
}

function Next () {
  return null
}

function Thumb () {
  return null
}

function mapColumnNumbertoBreakpoints (obj, cols) {
  const breakpoints = {}
  if (obj.hasOwnProperty('ultralarge')) { breakpoints['140.625rem'] = obj.ultralarge }
  if (obj.hasOwnProperty('xlarge')) { breakpoints['90rem'] = obj.xlarge }
  if (obj.hasOwnProperty('large')) { breakpoints['75rem'] = obj.large }
  if (obj.hasOwnProperty('medium')) { breakpoints['64rem'] = obj.medium }
  if (obj.hasOwnProperty('small')) { breakpoints['53.125rem'] = obj.small }
  if (obj.hasOwnProperty('mini')) { breakpoints['40rem'] = obj.mini }
  if (obj.hasOwnProperty('tiny')) { breakpoints['25.9375rem'] = obj.tiny }
  if (obj.hasOwnProperty('default')) {
    breakpoints.default = obj.default
  } else {
    breakpoints.default = 3
  }
  const options = {}
  for (const item in breakpoints) {
    options[item] = breakpoints[item] > cols ? cols : breakpoints[item]
  }
  return options
}

// ====================================================================== Export
function Slider ({
    collection,
    arrowSelectors,
    rangeInput,
    rows,
    displayOptions,
    children
  }) {

  const [display, setDisplay] = useState(4)
  const [left, setLeft] = useState(0)
  const [columnWidth, setColumnWidth] = useState(0)
  const [thumbPosition, setThumbPosition] = useState(0)

  const index = useRef(0)
  const range = useRef(0)
  const slidingRowWidth = useRef('100%')

  const animate = useRef(true)
  const rowContainer = useRef(null)
  const sliderInput = useRef(null)

  const content = children.find(child => child.type === Content)
  const previous = children.find(child => child.type === Previous)
  const next = children.find(child => child.type === Next)
  const thumb = children.find(child => child.type === Thumb)

  const columns = Math.ceil(collection.length / rows)
  const indices = columns - display
  const visibleColumns = mapColumnNumbertoBreakpoints(displayOptions, columns)
  // console.log(visibleColumns)
  // ================================================================= Functions
  useEffect(() => {
    if (columns < display) {
      setDisplay(columns)
    }

    handleSliderResize()

    const resize = () => { handleSliderResize() }
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useLayoutEffect(() => {
    updateElementWidths()
  }, [display])

  const updateElementWidths = () => {
    console.log(display)
    const width = rowContainer.current.clientWidth / display
    animate.current = false
    slidingRowWidth.current = (width * columns + 'px')
    setColumnWidth(width)
    setSliderPosition()
  }

  const setSliderPosition = () => {
    setLeft((-1 * index.current) * columnWidth)
  }

  const incrementIndex = (val) => {
    animate.current = true
    if (val === 'up') {
      index.current = (Math.min(index.current + 1, columns - display))
    } else {
      index.current = (Math.max(index.current - 1, 0))
    }
    setSliderPosition()
  }

  const handleSliderResize = () => {
    matchBreakpointDisplayAmount()
    if (index.current > indices) {
      index.current = Math.max(indices, 0)
    }
    // if (rangeInput) {
    //   instance.inputWidth = instance.$refs.sliderInput.getBoundingClientRect().width
    // }
  }

  const matchBreakpointDisplayAmount = () => {
    let reset = true
    for (const breakpoint in visibleColumns) {
      if (window.matchMedia(`(max-width: ${breakpoint})`).matches) {
        if (reset) { reset = false }
        setDisplay(visibleColumns[breakpoint])
      }
    }
    if (reset) {
      display = visibleColumns.default
    }
  }

  const handleSliderChange = () => {
    const pos = (sliderInput.current.value - (indices / 2)) / ((indices * indices + 1) - (indices / 2))
    setThumbPosition(Math.max(pos * (sliderInput.current.clientWidth - 36), 0))
  }

  useEffect(() => {
    console.log(thumbPosition)
    animate.current = true
    const value = thumbPosition / sliderInput.current.clientWidth
    const i = Math.trunc((value - (value % indices)) / indices)
    console.log(i)
    const newIndex = Math.max(0, Math.min(i, indices))
    if (newIndex !== index.current) {
      index.current = newIndex
      setSliderPosition()
    }
  }, [thumbPosition])

  const containerStyles = {
    left: `${left}px`,
    width: slidingRowWidth.current
  }

  const contentStyles = {
    width: `${columnWidth}px`
  }

  const thumbStyles = {
    left: `${thumbPosition}px`
  }

  // ========================================================= Template [Slider]
  return (
    <div className="zero_slider-container">

      <div className="zero_slider">
        <div
          className="zero_slider-row-container"
          ref={rowContainer}>
          <div
            className={ clsx("zero_slider-row", animate ? 'zero_sliding': '')}
            style={containerStyles}>

            {content.props.children && (
              content.props.children.map((item, i) => (
                <div
                  key={`slider-item-${i}`}
                  className="zero_click-wrapper"
                  style={contentStyles}>

                  { item }

                </div>
              ))
            )}

          </div>
        </div>
      </div>

      <div className="zero_slider-controls">

        { arrowSelectors && (
          <div className="zero_slide-selector">
            <div onClick={() => {incrementIndex('down')}}>
              {previous.props.children ? previous.props.children : ''}
            </div>
            <div onClick={() => {incrementIndex('up')}}>
              {next.props.children ? next.props.children : ''}
            </div>
          </div>
        )}

        { rangeInput && (
          <div className="zero_slider-range-input">
            <div
              className="zero_slider-dummy-thumb"
              style={thumbStyles}>
              {thumb.props.children ? thumb.props.children : ''}
            </div>
            <input
              ref={sliderInput}
              onChange={() => { handleSliderChange() }}
              type="range"
              step="0.1"
              min={indices / 2}
              max={indices * indices + 1}/>
          </div>
        )}

      </div>

    </div>
  )
}

Slider.Content = Content
Slider.Previous = Previous
Slider.Next = Next
Slider.Thumb = Thumb

Slider.defaultProps = {
  arrowSelectors: true,
  rangeInput: false,
  rows: 1,
  displayOptions: { default: 3 }
}

// ====================================================================== Export
export default Slider
