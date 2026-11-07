import React from 'react';

export function UpdatedDate({ generatedAt }) {
  const parts = generatedAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Shanghai' }).formatToParts(new Date(generatedAt)) : [];
  const date = ['month', 'day', 'year'].map((type) => parts.find((part) => part.type === type)?.value).join(' ');
  return <div className="selected-updated"><span>DATA UPDATED</span><time dateTime={generatedAt}>{generatedAt ? date : 'Date unavailable'}</time></div>;
}
